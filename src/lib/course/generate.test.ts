// generateCourse의 beforeExternalCalls 호출 시점을 고정하는 단위 테스트다. 외부 호출은 전부 가짜라 0번이다.
// 실행: npx -y tsx@4.23.12 --conditions=react-server --test src/lib/course/generate.test.ts
import assert from "node:assert/strict";
import { test } from "node:test";
import { generateCourse, type GenerateDeps } from "@/lib/course/generate";
import { AppError } from "@/lib/errors";

// 클라이언트 모듈이 import 시점에 읽는 값은 없지만, 실수로 진짜 DB를 부르지 않도록 가짜 값을 둔다.
process.env.SUPABASE_URL = "https://example.supabase.co";
process.env.SUPABASE_SECRET_KEY = "fake-secret-key-0000";

const usage = { inputTokens: 1, outputTokens: 1, reasoningTokens: 0 };
const typeMap: Record<number, number> = { 1: 12, 2: 12, 3: 12, 4: 14, 5: 14, 6: 39, 7: 39 };
const candidates = Object.entries(typeMap).map(([id, contentTypeId]) => ({
  id: Number(id),
  contentTypeId,
  title: `장소${id}`,
  address: `주소 ${id}`,
  distanceMeters: 100 * Number(id),
}));
const pool = {
  anchor: { id: 99, contentTypeId: 12, title: "기준점", address: "서울특별시 종로구 1" },
  radiusMeters: 20000,
  candidates,
  missingTypes: [],
  listedCounts: {},
  truncatedTypeIds: [],
  skipped: 0,
};
const goodPicks = (ids: number[]) => ({ ok: true as const, placeIds: ids, usage, durationMs: 1, promptVersion: "v1" });
const badPicks = () => ({ ok: false as const, violations: ["wrong_count" as const], usage, durationMs: 1, promptVersion: "v1" });

function harness(picks: unknown[]) {
  const order: string[] = [];
  const detailOptions: unknown[] = [];
  const queue = [...picks];
  const deps = {
    collectCandidates: async () => {
      order.push("collect");
      return pool;
    },
    requestCoursePicks: async () => {
      order.push("ai");
      return queue.shift();
    },
    getPlaceDetail: async (id: number, detailCall?: unknown) => {
      order.push("detail");
      detailOptions.push(detailCall);
      return { place: { id }, detail: { placeId: id, acmpyTypeCd: "전구역 동반가능" } };
    },
    createCourse: async () => {
      order.push("save");
    },
  } as unknown as Partial<GenerateDeps>;
  return { deps, order, detailOptions };
}

const REQ = { sido: "11", types: [12, 14, 39] };
const far = () => Date.now() + 80_000;

test("입력 검증에 실패하면 콜백도 외부 호출도 없다", async () => {
  const { deps, order } = harness([]);
  let called = 0;
  await assert.rejects(
    generateCourse(
      { types: [12] },
      {
        deadlineAt: far(),
        deps,
        beforeExternalCalls: async () => {
          called += 1;
        },
      },
    ),
    (e: unknown) => e instanceof AppError && e.code === "INVALID_INPUT",
  );
  assert.equal(called, 0);
  assert.deepEqual(order, []);
});

test("검증 뒤 외부 호출 전에 정확히 한 번 불린다", async () => {
  const { deps, order } = harness([goodPicks([1, 4, 6, 2, 7])]);
  await generateCourse(REQ, {
    deadlineAt: far(),
    deps,
    beforeExternalCalls: async () => {
      order.push("callback");
    },
  });
  assert.equal(order[0], "callback");
  assert.equal(order.filter((step) => step === "callback").length, 1);
  assert.deepEqual(order.slice(1, 3), ["collect", "ai"]);
});

test("AI 재시도가 있어도 콜백은 한 번만 불린다", async () => {
  const { deps, order } = harness([badPicks(), goodPicks([1, 4, 6, 2, 7])]);
  await generateCourse(REQ, {
    deadlineAt: far(),
    deps,
    beforeExternalCalls: async () => {
      order.push("callback");
    },
  });
  assert.equal(order.filter((step) => step === "callback").length, 1);
  assert.equal(order.filter((step) => step === "ai").length, 2);
  assert.equal(order[0], "callback");
});

test("콜백이 던지면 외부 호출 없이 그 오류로 끝난다", async () => {
  const { deps, order } = harness([goodPicks([1, 4, 6, 2, 7])]);
  await assert.rejects(
    generateCourse(REQ, {
      deadlineAt: far(),
      deps,
      beforeExternalCalls: async () => {
        throw new AppError("RATE_LIMIT", "x", 429);
      },
    }),
    (e: unknown) => e instanceof AppError && e.code === "RATE_LIMIT",
  );
  assert.deepEqual(order, []);
});

test("콜백을 주지 않아도 동작한다", async () => {
  const { deps } = harness([goodPicks([1, 4, 6, 2, 7])]);
  const result = await generateCourse(REQ, { deadlineAt: far(), deps });
  assert.equal(result.placeIds.length, 5);
});

test("상세 확인은 관광공사 한도 콜백(beforeTourCalls)을 넘기지 않는다 (코스 한도가 이미 세므로 이중으로 세지 않는다)", async () => {
  const { deps, detailOptions } = harness([goodPicks([1, 4, 6, 2, 7])]);
  await generateCourse(REQ, {
    deadlineAt: far(),
    deps,
    beforeExternalCalls: async () => {
      // 코스 한도 확인 자리
    },
  });
  assert.equal(detailOptions.length, 5);
  for (const options of detailOptions as Record<string, unknown>[]) {
    assert.ok(options !== undefined && typeof options.deadlineAt === "number");
    assert.ok(!("beforeTourCalls" in options), "상세 확인이 beforeTourCalls를 넘김");
  }
});
