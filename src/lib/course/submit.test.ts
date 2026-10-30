// /api/course 호출 결과 분류를 고정하는 단위 테스트다. fetch는 가짜라 외부 호출은 0번이다.
// 실행: npx -y tsx@4.23.12 --conditions=react-server --test src/lib/course/submit.test.ts
import assert from "node:assert/strict";
import { test } from "node:test";
import { postCourse, type SubmitOutcome } from "@/lib/course/submit";

const REQUEST = { sido: "11", types: [12, 14] };
const ID = "6122d3c5-b0a3-4218-bcac-0cbfffca606b";

const json = (body: unknown, status = 200) =>
  Response.json(body, { status }) as Response;
const text = (body: string, status: number) => new Response(body, { status });

// 신호가 중단되면 거절하는 가짜 fetch다. 응답을 영원히 주지 않는다.
const hangingFetch: typeof fetch = (_url, init) =>
  new Promise((_resolve, reject) => {
    init?.signal?.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError")));
  });

async function run(fetchImpl: typeof fetch, extra: { signal?: AbortSignal; waitMs?: number } = {}): Promise<SubmitOutcome> {
  return postCourse(REQUEST, { fetchImpl, ...extra });
}

test("성공: id만 돌려준다", async () => {
  const outcome = await run(async () => json({ id: ID, missingTypes: [] }));
  assert.deepEqual(outcome, { kind: "ok", id: ID });
});

test("요청은 POST JSON으로 보내고, 보낸 본문에 요청 값이 그대로 들어간다", async () => {
  let seen: { method?: string; body?: unknown; type?: string | null } = {};
  await run(async (_url, init) => {
    seen = {
      method: init?.method,
      body: JSON.parse(String(init?.body)),
      type: new Headers(init?.headers).get("content-type"),
    };
    return json({ id: ID });
  });
  assert.deepEqual(seen, { method: "POST", body: REQUEST, type: "application/json" });
});

test("서버 오류 JSON은 코드와 서버 문구, 상태를 그대로 전한다", async () => {
  const cases: [number, string][] = [
    [429, "RATE_LIMIT"],
    [504, "API_TIMEOUT"],
    [502, "API_FAILED"],
    [502, "BAD_AI_RESPONSE"],
    [400, "INVALID_INPUT"],
    [422, "INVALID_INPUT"],
    [503, "DB_UNAVAILABLE"],
  ];
  for (const [status, code] of cases) {
    const outcome = await run(async () => json({ error: { code, message: "서버 문구" } }, status));
    assert.deepEqual(outcome, { kind: "error", code, cause: "server", status, message: "서버 문구" }, `${status} ${code}`);
  }
});

test("JSON이 아닌 504(플랫폼 시간 초과)는 API_TIMEOUT, 그 밖의 비JSON은 API_FAILED", async () => {
  assert.deepEqual(await run(async () => text("<html>Gateway Timeout</html>", 504)), {
    kind: "error",
    code: "API_TIMEOUT",
    cause: "bad-response",
    status: 504,
  });
  assert.deepEqual(await run(async () => text("An error occurred", 500)), {
    kind: "error",
    code: "API_FAILED",
    cause: "bad-response",
    status: 500,
  });
  assert.deepEqual(await run(async () => text("<html>bad gateway</html>", 502)), {
    kind: "error",
    code: "API_FAILED",
    cause: "bad-response",
    status: 502,
  });
});

test("JSON이지만 모르는 오류 모양이거나 모르는 코드면 API_FAILED", async () => {
  const unknownShape = await run(async () => json({ oops: true }, 500));
  assert.equal(unknownShape.kind === "error" && unknownShape.code, "API_FAILED");
  const unknownCode = await run(async () => json({ error: { code: "NOPE", message: "x" } }, 500));
  assert.equal(unknownCode.kind === "error" && unknownCode.code, "API_FAILED");
});

test("성공 응답이지만 id가 uuid가 아니거나 없으면 API_FAILED", async () => {
  for (const body of [{ id: "123" }, { missingTypes: [] }, { id: 5 }]) {
    const outcome = await run(async () => json(body));
    assert.equal(outcome.kind === "error" && outcome.code, "API_FAILED");
    assert.equal(outcome.kind === "error" && outcome.cause, "bad-response");
  }
});

test("네트워크 오류(fetch가 던짐)는 API_FAILED, 원인은 network", async () => {
  const outcome = await run(async () => {
    throw new TypeError("Failed to fetch");
  });
  assert.deepEqual(outcome, { kind: "error", code: "API_FAILED", cause: "network" });
});

test("대기 한도를 넘기면 API_TIMEOUT, 원인은 client-timeout", async () => {
  const outcome = await run(hangingFetch, { waitMs: 20 });
  assert.deepEqual(outcome, { kind: "error", code: "API_TIMEOUT", cause: "client-timeout" });
});

test("호출하는 쪽이 취소하면 aborted이고 오류로 보지 않는다", async () => {
  const controller = new AbortController();
  const pending = run(hangingFetch, { signal: controller.signal, waitMs: 5_000 });
  controller.abort();
  assert.deepEqual(await pending, { kind: "aborted" });
});

test("이미 취소된 신호로 부르면 fetch를 하지 않고 aborted", async () => {
  const controller = new AbortController();
  controller.abort();
  let called = 0;
  const outcome = await run(
    async () => {
      called += 1;
      return json({ id: ID });
    },
    { signal: controller.signal },
  );
  assert.deepEqual(outcome, { kind: "aborted" });
  assert.equal(called, 0);
});

test("본문을 읽는 도중 대기 한도가 지나도 API_TIMEOUT(client-timeout)이다", async () => {
  const slowBody: typeof fetch = (_url, init) =>
    Promise.resolve({
      ok: true,
      status: 200,
      json: () =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError")));
        }),
    } as unknown as Response);
  const outcome = await run(slowBody, { waitMs: 20 });
  assert.deepEqual(outcome, { kind: "error", code: "API_TIMEOUT", cause: "client-timeout" });
});
