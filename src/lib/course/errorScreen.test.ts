// 오류 결과 -> 화면 종류 매핑을 고정하는 단위 테스트다. 외부 호출은 0번이다.
// 실행: npx -y tsx@4.23.12 --conditions=react-server --test src/lib/course/errorScreen.test.ts
import assert from "node:assert/strict";
import { test } from "node:test";
import { classifySubmitError } from "@/lib/course/errorScreen";
import type { SubmitOutcome } from "@/lib/course/submit";

type SubmitError = Extract<SubmitOutcome, { kind: "error" }>;
const err = (fields: Partial<SubmitError> & Pick<SubmitError, "code">): SubmitError => ({
  kind: "error",
  cause: "server",
  ...fields,
});

test("RATE_LIMIT: 서버 문구를 넘긴다", () => {
  assert.deepEqual(classifySubmitError(err({ code: "RATE_LIMIT", status: 429, message: "잠시 후 다시 시도해 주세요." })), {
    kind: "screen",
    screen: "rate-limit",
    message: "잠시 후 다시 시도해 주세요.",
  });
});

test("RATE_LIMIT: 서버 문구가 없거나 비어 있으면 문구 없이 화면만", () => {
  assert.deepEqual(classifySubmitError(err({ code: "RATE_LIMIT", cause: "bad-response" })), {
    kind: "screen",
    screen: "rate-limit",
    message: undefined,
  });
  assert.equal(
    (classifySubmitError(err({ code: "RATE_LIMIT", message: "" })) as { message?: string }).message,
    undefined,
  );
});

test("API_TIMEOUT: 서버, 플랫폼, 클라이언트 대기 초과 모두 timeout 화면", () => {
  for (const cause of ["server", "bad-response", "client-timeout"] as const) {
    assert.deepEqual(classifySubmitError(err({ code: "API_TIMEOUT", cause, status: 504 })), { kind: "screen", screen: "timeout" });
  }
});

test("API_FAILED: 네트워크와 형식이 다른 응답도 api-failed 화면", () => {
  for (const cause of ["server", "network", "bad-response"] as const) {
    assert.deepEqual(classifySubmitError(err({ code: "API_FAILED", cause })), { kind: "screen", screen: "api-failed" });
  }
});

test("BAD_AI_RESPONSE와 DB_UNAVAILABLE", () => {
  assert.deepEqual(classifySubmitError(err({ code: "BAD_AI_RESPONSE", status: 502 })), { kind: "screen", screen: "course-failed" });
  assert.deepEqual(classifySubmitError(err({ code: "DB_UNAVAILABLE", status: 503 })), { kind: "screen", screen: "db-unavailable" });
});

test("INVALID_INPUT 422: 조건 부족 화면, 서버 문구를 넘긴다", () => {
  assert.deepEqual(classifySubmitError(err({ code: "INVALID_INPUT", status: 422, message: "조건에 맞는 장소가 부족해요." })), {
    kind: "screen",
    screen: "insufficient",
    message: "조건에 맞는 장소가 부족해요.",
  });
});

test("INVALID_INPUT 400과 그 밖의 status: 폼 오류 박스, 서버 문구는 쓰지 않는다", () => {
  assert.deepEqual(classifySubmitError(err({ code: "INVALID_INPUT", status: 400, message: "서버 문구" })), { kind: "form-error" });
  assert.deepEqual(classifySubmitError(err({ code: "INVALID_INPUT", status: 404 })), { kind: "form-error" });
  assert.deepEqual(classifySubmitError(err({ code: "INVALID_INPUT" })), { kind: "form-error" });
});
