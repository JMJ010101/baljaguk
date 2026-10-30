// isDbTimeoutError의 판별 기준을 고정하는 단위 테스트다.
// 실행: npx -y tsx@4.23.12 --conditions=react-server --test src/lib/db/errors.test.ts
// tsx는 프로젝트에 설치하지 않고 npx로만 쓴다. package.json에 test 스크립트는 추가하지 않는다. (사용자 결정, 2026-10-31)
import assert from "node:assert/strict";
import { test } from "node:test";
import { isDbTimeoutError } from "@/lib/db/errors";

test("supabase-js가 돌려주는 타임아웃 모양(관찰한 값)이면 true", () => {
  assert.equal(
    isDbTimeoutError({ error: { message: "TimeoutError: The operation was aborted due to timeout" }, status: 0 }),
    true,
  );
});

test("TimeoutError 접두어만 있고 status가 0이 아니면 false", () => {
  assert.equal(isDbTimeoutError({ error: { message: "TimeoutError: x" }, status: 500 }), false);
  assert.equal(isDbTimeoutError({ error: { message: "TimeoutError: x" }, status: 504 }), false);
  assert.equal(isDbTimeoutError({ error: { message: "TimeoutError: x" } }), false);
});

test("status가 0이어도 메시지가 TimeoutError로 시작하지 않으면 false", () => {
  assert.equal(isDbTimeoutError({ error: { message: "TypeError: fetch failed" }, status: 0 }), false);
  assert.equal(isDbTimeoutError({ error: { message: "AbortError: This operation was aborted" }, status: 0 }), false);
  assert.equal(isDbTimeoutError({ error: { message: "The operation was aborted due to timeout" }, status: 0 }), false);
});

test("대소문자와 위치가 다르면 false (접두어 일치만 인정)", () => {
  assert.equal(isDbTimeoutError({ error: { message: "timeouterror: x" }, status: 0 }), false);
  assert.equal(isDbTimeoutError({ error: { message: "Error: TimeoutError" }, status: 0 }), false);
});

test("서버 쪽 statement timeout(DB가 쿼리를 취소함)은 우리 타임아웃이 아니다", () => {
  assert.equal(
    isDbTimeoutError({ error: { message: "canceling statement due to statement timeout" }, status: 500 }),
    false,
  );
});

test("오류가 없거나 메시지가 없으면 false", () => {
  assert.equal(isDbTimeoutError({ error: null, status: 201 }), false);
  assert.equal(isDbTimeoutError({ error: undefined, status: 0 }), false);
  assert.equal(isDbTimeoutError({ error: {}, status: 0 }), false);
});
