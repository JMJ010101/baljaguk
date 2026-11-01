// 코스 장소 조회의 분류를 고정하는 단위 테스트다. 캐시와 관광공사는 가짜라 외부 호출은 0번이다.
// 실행: npx -y tsx@4.23.12 --conditions=react-server --test src/lib/course/places.test.ts
import assert from "node:assert/strict";
import { test } from "node:test";
import { loadCoursePlaces, type CoursePlacesDeps } from "@/lib/course/places";
import { AppError } from "@/lib/errors";

const cachedOf = (id: number) => ({ place: { id, contentTypeId: 12, title: `장소${id}` }, detail: { placeId: id } });

type Behavior = {
  // placeId -> "fresh" | "expired" | "none" | Error
  cache?: Record<number, "fresh" | "expired" | "none" | Error>;
  detail?: Record<number, "ok" | Error>;
};

function harness(behavior: Behavior) {
  const calls = { cache: [] as number[], detail: [] as number[], limit: 0 };
  const deps = {
    getCachedPlaceAnyAge: async (id: number) => {
      calls.cache.push(id);
      const entry = behavior.cache?.[id] ?? "fresh";
      if (entry instanceof Error) throw entry;
      if (entry === "none") return null;
      return { cached: cachedOf(id), expired: entry === "expired" };
    },
    getPlaceDetail: async (id: number) => {
      calls.detail.push(id);
      const entry = behavior.detail?.[id] ?? "ok";
      if (entry instanceof Error) throw entry;
      return cachedOf(id);
    },
  } as unknown as CoursePlacesDeps;
  return { calls, deps };
}

const limitCounter = (calls: { limit: number }, error?: Error) => async () => {
  calls.limit++;
  if (error) throw error;
};

test("모두 캐시에 있으면 순서대로 돌려주고 한도도 관광공사도 쓰지 않는다", async () => {
  const { calls, deps } = harness({});
  const result = await loadCoursePlaces([3, 1, 2], { beforeTourCalls: limitCounter(calls) }, deps);
  assert.ok(result.ok);
  assert.deepEqual(result.ok && result.places.map((p) => p.kind === "ok" && p.place.id), [3, 1, 2]);
  assert.deepEqual(calls.detail, []);
  assert.equal(calls.limit, 0);
});

test("만료된 캐시는 stale로 그대로 쓰고 관광공사를 부르지 않는다", async () => {
  const { calls, deps } = harness({ cache: { 2: "expired" } });
  const result = await loadCoursePlaces([1, 2], {}, deps);
  assert.ok(result.ok);
  const stale = result.ok ? result.places.map((p) => p.kind === "ok" && p.stale) : [];
  assert.deepEqual(stale, [false, true]);
  assert.deepEqual(calls.detail, []);
});

test("캐시 행이 없는 장소가 여러 곳이어도 한도는 한 번만 센다", async () => {
  const { calls, deps } = harness({ cache: { 1: "none", 2: "none", 3: "none" } });
  const result = await loadCoursePlaces([1, 2, 3], { beforeTourCalls: limitCounter(calls) }, deps);
  assert.ok(result.ok);
  assert.equal(calls.limit, 1);
  assert.deepEqual(calls.detail.sort(), [1, 2, 3]);
});

test("일부 장소가 실패하면 그 자리만 failed로 두고 순서를 유지한다", async () => {
  const { deps } = harness({
    cache: { 2: "none", 3: "none" },
    detail: { 2: new AppError("INVALID_INPUT", "x", 404), 3: new AppError("API_FAILED", "x", 502) },
  });
  const result = await loadCoursePlaces([1, 2, 3], {}, deps);
  assert.ok(result.ok);
  assert.deepEqual(result.ok && result.places.map((p) => (p.kind === "ok" ? "ok" : p.reason)), ["ok", "not-found", "unavailable"]);
});

test("한 곳이라도 DB 오류면 코스 전체가 DB_UNAVAILABLE", async () => {
  const { deps } = harness({ cache: { 2: new AppError("DB_UNAVAILABLE", "x", 503) } });
  assert.deepEqual(await loadCoursePlaces([1, 2, 3], {}, deps), { ok: false, code: "DB_UNAVAILABLE" });
});

test("전부 실패하면 오류. RATE_LIMIT이 섞여 있으면 서버 문구와 함께 RATE_LIMIT", async () => {
  const limited = new AppError("RATE_LIMIT", "조회 가능 횟수를 넘었어요.", 429);
  const { calls, deps } = harness({ cache: { 1: "none", 2: "none" } });
  const result = await loadCoursePlaces([1, 2], { beforeTourCalls: limitCounter(calls, limited) }, deps);
  assert.deepEqual(result, { ok: false, code: "RATE_LIMIT", message: "조회 가능 횟수를 넘었어요." });
  assert.deepEqual(calls.detail, []);

  const failed = harness({
    cache: { 1: "none", 2: "none" },
    detail: { 1: new AppError("API_FAILED", "x", 502), 2: new AppError("API_TIMEOUT", "x", 504) },
  });
  assert.deepEqual(await loadCoursePlaces([1, 2], {}, failed.deps), { ok: false, code: "API_FAILED" });
});

test("한도 초과는 일부 장소만 걸려도 코스는 보여 준다", async () => {
  const { deps } = harness({ cache: { 2: "none" } });
  const limited = new AppError("RATE_LIMIT", "x", 429);
  const result = await loadCoursePlaces([1, 2], { beforeTourCalls: async () => { throw limited; } }, deps);
  assert.ok(result.ok);
  assert.deepEqual(result.ok && result.places.map((p) => (p.kind === "ok" ? "ok" : p.reason)), ["ok", "unavailable"]);
});

test("AppError가 아닌 예외는 삼키지 않고 던진다", async () => {
  const { deps } = harness({ cache: { 1: new TypeError("버그") } });
  await assert.rejects(() => loadCoursePlaces([1], {}, deps), TypeError);
});
