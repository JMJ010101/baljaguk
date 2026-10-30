// 코스 만들기 폼 검증과 오류 문구를 고정하는 단위 테스트다. 외부 호출은 0번이다.
// 실행: npx -y tsx@4.23.12 --conditions=react-server --test src/lib/course/formErrors.test.ts
import assert from "node:assert/strict";
import { test } from "node:test";
import { buildCourseRequestInput, moodLength, validateCourseForm, type CourseFormValues } from "@/lib/course/formErrors";

const valid: CourseFormValues = { sido: "11", sigungu: "", types: [12], mood: "" };

function errorsOf(values: CourseFormValues) {
  const result = validateCourseForm(values);
  assert.equal(result.ok, false);
  return result.ok ? {} : result.errors;
}

test("정상 값은 통과하고, 비어 있는 시군구와 분위기는 요청에 넣지 않는다", () => {
  const result = validateCourseForm(valid);
  assert.equal(result.ok, true);
  assert.deepEqual(result.ok ? result.request : undefined, { sido: "11", types: [12] });
  assert.deepEqual(buildCourseRequestInput(valid), { sido: "11", types: [12] });
});

test("시군구와 분위기가 있으면 요청에 담고, 분위기는 공백을 정리한다", () => {
  const result = validateCourseForm({ sido: "50", sigungu: "130", types: [12, 39], mood: "  조용하고\n한적한   곳 " });
  assert.deepEqual(result.ok ? result.request : undefined, {
    sido: "50",
    sigungu: "130",
    types: [12, 39],
    mood: "조용하고 한적한 곳",
  });
});

test("공백뿐인 분위기는 없는 것으로 본다", () => {
  const result = validateCourseForm({ ...valid, mood: "   \n  " });
  assert.equal(result.ok, true);
  assert.equal(result.ok ? result.request.mood : "x", undefined);
});

test("시도를 고르지 않으면 지역 오류", () => {
  assert.deepEqual(errorsOf({ ...valid, sido: "" }), { sido: "지역을 선택해 주세요." });
});

test("유형이 0개면 1개 이상 고르라는 문구, 4개면 최대 3개 문구", () => {
  assert.deepEqual(errorsOf({ ...valid, types: [] }), { types: "장소 유형을 1개 이상 골라 주세요." });
  assert.deepEqual(errorsOf({ ...valid, types: [12, 14, 28, 39] }), { types: "장소 유형은 최대 3개까지 고를 수 있어요." });
});

test("허용하지 않는 유형(쇼핑 38)이나 중복은 다시 고르라는 문구", () => {
  assert.deepEqual(errorsOf({ ...valid, types: [38] }), { types: "장소 유형을 다시 골라 주세요." });
  assert.deepEqual(errorsOf({ ...valid, types: [12, 12] }), { types: "장소 유형을 다시 골라 주세요." });
});

test("시군구 형식이 틀리면 시군구 오류", () => {
  assert.deepEqual(errorsOf({ ...valid, sigungu: "abc" }), { sigungu: "시·군·구를 다시 선택해 주세요." });
});

test("분위기는 정리한 뒤 100자는 통과, 101자는 현재 글자 수와 함께 거절한다(자르지 않는다)", () => {
  assert.equal(validateCourseForm({ ...valid, mood: "ㅋ".repeat(100) }).ok, true);
  assert.deepEqual(errorsOf({ ...valid, mood: "ㅋ".repeat(101) }), {
    mood: "분위기는 100자 이하로 적어 주세요. (현재 101자)",
  });
});

test("공백이 많아 입력은 길지만 정리하면 짧으면 글자 수는 정리한 길이로 센다", () => {
  const mood = "가" + " ".repeat(400) + "나";
  assert.equal(moodLength(mood), 3);
  assert.equal(validateCourseForm({ ...valid, mood }).ok, true);
});

test("정리하기 전 입력이 1000자를 넘으면(정리 후는 짧아도) 줄여 달라는 문구", () => {
  assert.deepEqual(errorsOf({ ...valid, mood: "가" + " ".repeat(1100) + "나" }), {
    mood: "분위기가 너무 길어요. 공백과 줄바꿈을 줄여 주세요.",
  });
});

test("여러 필드가 틀리면 필드마다 오류를 돌려준다", () => {
  const errors = errorsOf({ sido: "", sigungu: "", types: [], mood: "ㅋ".repeat(101) });
  assert.deepEqual(Object.keys(errors).sort(), ["mood", "sido", "types"]);
});
