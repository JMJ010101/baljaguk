// 진행 안내 문구 구간을 고정하는 단위 테스트다. 외부 호출은 0번이다.
// 실행: npx -y tsx@4.23.12 --conditions=react-server --test src/lib/course/progress.test.ts
import assert from "node:assert/strict";
import { test } from "node:test";
import { COURSE_BUDGET_MS, COURSE_CLIENT_WAIT_MS, PROGRESS_STAGE_START_MS } from "@/lib/course/constants";
import { PROGRESS_MESSAGES, progressMessage } from "@/lib/course/progress";

test("문구 수와 구간 시작 시각 수가 같고, 시작 시각은 0부터 오름차순이다", () => {
  assert.equal(PROGRESS_MESSAGES.length, PROGRESS_STAGE_START_MS.length);
  assert.equal(PROGRESS_STAGE_START_MS[0], 0);
  for (let i = 1; i < PROGRESS_STAGE_START_MS.length; i++) {
    assert.ok(PROGRESS_STAGE_START_MS[i] > PROGRESS_STAGE_START_MS[i - 1]);
  }
});

test("경계에서 문구가 바뀐다(0, 10, 30, 60초)", () => {
  assert.equal(progressMessage(0), "코스를 만들고 있어요.");
  assert.equal(progressMessage(9_999), "코스를 만들고 있어요.");
  assert.equal(progressMessage(10_000), "조건에 맞는 장소를 고르고 있어요. 조금만 기다려 주세요.");
  assert.equal(progressMessage(29_999), "조건에 맞는 장소를 고르고 있어요. 조금만 기다려 주세요.");
  assert.equal(progressMessage(30_000), "평소보다 조금 걸리고 있어요.");
  assert.equal(progressMessage(59_999), "평소보다 조금 걸리고 있어요.");
  assert.equal(progressMessage(60_000), "오래 걸리고 있어요. 조금만 더 기다려 주세요.");
});

test("100초를 넘어도 마지막 문구를 유지하고, 음수는 첫 문구다", () => {
  assert.equal(progressMessage(100_000), "오래 걸리고 있어요. 조금만 더 기다려 주세요.");
  assert.equal(progressMessage(10 * 60_000), "오래 걸리고 있어요. 조금만 더 기다려 주세요.");
  assert.equal(progressMessage(-1), "코스를 만들고 있어요.");
});

test("문구에 숫자 소요 시간을 쓰지 않는다", () => {
  for (const message of PROGRESS_MESSAGES) assert.doesNotMatch(message, /\d|초|분/, message);
});

test("클라이언트 대기 한도(100초)는 서버 마감(80초)보다 길고 route maxDuration(90초)보다도 길다", () => {
  const ROUTE_MAX_DURATION_MS = 90_000; // route.ts의 maxDuration 리터럴(90초)과 같은 값. 바꾸면 함께 고친다.
  assert.ok(COURSE_CLIENT_WAIT_MS > COURSE_BUDGET_MS);
  assert.ok(COURSE_CLIENT_WAIT_MS > ROUTE_MAX_DURATION_MS);
  assert.equal(COURSE_CLIENT_WAIT_MS, 100_000);
});
