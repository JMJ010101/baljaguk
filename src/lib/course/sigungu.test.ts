// 시군구 호출 결과 분류를 고정하는 단위 테스트다. fetch는 가짜라 외부 호출은 0번이다.
// 실행: npx -y tsx@4.23.12 --conditions=react-server --test src/lib/course/sigungu.test.ts
import assert from "node:assert/strict";
import { test } from "node:test";
import { fetchSigungu, sigunguNotice } from "@/lib/course/sigungu";

const json = (body: unknown, status = 200) => Response.json(body, { status }) as Response;

const hangingFetch: typeof fetch = (_url, init) =>
  new Promise((_resolve, reject) => {
    init?.signal?.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError")));
  });

test("성공: regions만 읽고 skipped 같은 다른 필드는 무시한다", async () => {
  const outcome = await fetchSigungu("11", {
    fetchImpl: async () => json({ regions: [{ code: "110", name: "종로구" }], skipped: 0 }),
  });
  assert.deepEqual(outcome, { kind: "ok", regions: [{ code: "110", name: "종로구" }] });
});

test("요청 주소에 시도 코드를 싣는다", async () => {
  let called = "";
  await fetchSigungu("36110", {
    fetchImpl: async (url) => {
      called = String(url);
      return json({ regions: [] });
    },
  });
  assert.equal(called, "/api/regions?sido=36110");
});

test("빈 목록과 INVALID_INPUT 404는 empty", async () => {
  assert.deepEqual(await fetchSigungu("11", { fetchImpl: async () => json({ regions: [] }) }), { kind: "empty" });
  assert.deepEqual(
    await fetchSigungu("99", { fetchImpl: async () => json({ error: { code: "INVALID_INPUT", message: "x" } }, 404) }),
    { kind: "empty" },
  );
});

test("INVALID_INPUT 400은 error (empty가 아니다)", async () => {
  assert.deepEqual(
    await fetchSigungu("11", { fetchImpl: async () => json({ error: { code: "INVALID_INPUT", message: "x" } }, 400) }),
    { kind: "error" },
  );
});

test("RATE_LIMIT 429: 서버 문구를 담는다", async () => {
  assert.deepEqual(
    await fetchSigungu("11", {
      fetchImpl: async () => json({ error: { code: "RATE_LIMIT", message: "장소 조회 요청이 많아요." } }, 429),
    }),
    { kind: "rate-limit", message: "장소 조회 요청이 많아요." },
  );
});

test("그 밖의 서버 오류, 네트워크 오류, 형식이 다른 응답은 error", async () => {
  assert.deepEqual(
    await fetchSigungu("11", { fetchImpl: async () => json({ error: { code: "API_FAILED", message: "x" } }, 502) }),
    { kind: "error" },
  );
  assert.deepEqual(
    await fetchSigungu("11", {
      fetchImpl: async () => {
        throw new TypeError("network");
      },
    }),
    { kind: "error" },
  );
  assert.deepEqual(await fetchSigungu("11", { fetchImpl: async () => new Response("<html>", { status: 504 }) }), { kind: "error" });
  assert.deepEqual(await fetchSigungu("11", { fetchImpl: async () => json({ regions: [{ code: "", name: "" }] }) }), { kind: "error" });
});

test("취소: 이미 취소됐거나 진행 중에 취소되면 aborted", async () => {
  const done = new AbortController();
  done.abort();
  assert.deepEqual(await fetchSigungu("11", { signal: done.signal, fetchImpl: hangingFetch }), { kind: "aborted" });

  const controller = new AbortController();
  const pending = fetchSigungu("11", { signal: controller.signal, fetchImpl: hangingFetch });
  controller.abort();
  assert.deepEqual(await pending, { kind: "aborted" });
});

test("안내 문구: 어느 경우든 시군구 없이 만들 수 있다고 알린다", () => {
  assert.match(sigunguNotice({ kind: "error" }), /고르지 않고/);
  assert.match(sigunguNotice({ kind: "rate-limit", message: "요청이 많아요." }), /^요청이 많아요\. .*고르지 않고/);
  assert.match(sigunguNotice({ kind: "rate-limit" }), /^잠시 후 다시 시도해 주세요\./);
  assert.match(sigunguNotice({ kind: "empty" }), /지역 전체/);
});
