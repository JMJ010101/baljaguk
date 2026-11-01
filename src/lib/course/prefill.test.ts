// 다시 만들기 미리 채우기의 링크 생성과 쿼리 검증을 고정하는 단위 테스트다. 외부 호출은 0번이다.
// 실행: npx -y tsx@4.23.12 --conditions=react-server --test src/lib/course/prefill.test.ts
import assert from "node:assert/strict";
import { test } from "node:test";
import { buildRecreateHref, parseRecreatePrefill, resolveFormPrefill } from "@/lib/course/prefill";

test("링크: 시도, 시군구, 유형만 담는다", () => {
  assert.equal(buildRecreateHref({ sido: "11", sigungu: "110", types: [12, 39] }), "/course/new?sido=11&sigungu=110&types=12,39");
  assert.equal(buildRecreateHref({ sido: "36110", types: [28] }), "/course/new?sido=36110&types=28");
});

test("링크: 코스 id와 mood가 들어갈 자리가 없다", () => {
  // 코스 객체를 통째로 넘겨도 정해진 세 필드만 쓴다. 타입상 다른 필드는 인자에 없다.
  const course = { id: "6122d3c5-b0a3-4218-bcac-0cbfffca606b", sido: "11", sigungu: "110", types: [12], mood: "조용한 곳" };
  const href = buildRecreateHref({ sido: course.sido, sigungu: course.sigungu, types: course.types });
  assert.ok(!href.includes(course.id));
  assert.ok(!href.includes("mood"));
  assert.ok(!href.includes(encodeURIComponent(course.mood)));
});

test("링크를 만들어 다시 읽으면 같은 값이다", () => {
  const href = buildRecreateHref({ sido: "36110", sigungu: "110", types: [14, 28, 39] });
  const params = Object.fromEntries(new URL(href, "http://localhost").searchParams);
  assert.deepEqual(parseRecreatePrefill(params), { sido: "36110", sigungu: "110", types: [14, 28, 39] });
});

test("유효한 쿼리", () => {
  assert.deepEqual(parseRecreatePrefill({ sido: "11", sigungu: "110", types: "12,39" }), {
    sido: "11",
    sigungu: "110",
    types: [12, 39],
  });
});

test("누락된 항목은 비워 둔다", () => {
  assert.deepEqual(parseRecreatePrefill({}), {});
  assert.deepEqual(parseRecreatePrefill({ sido: "11" }), { sido: "11" });
  assert.deepEqual(parseRecreatePrefill({ types: "12" }), { types: [12] });
});

test("시도가 잘못이면 시군구도 버리고, 유형은 따로 본다", () => {
  for (const sido of ["", "abc", "1a", "123456", "-1", "1.5", " 11"]) {
    assert.deepEqual(parseRecreatePrefill({ sido, sigungu: "110", types: "12" }), { types: [12] }, sido);
  }
  assert.deepEqual(parseRecreatePrefill({ sigungu: "110" }), {});
});

test("시군구가 잘못이면 시군구만 버린다", () => {
  for (const sigungu of ["", "abc", "123456", "1 0"]) {
    assert.deepEqual(parseRecreatePrefill({ sido: "11", sigungu }), { sido: "11" }, sigungu);
  }
});

test("유형: 중복, 허용 외 유형, 4개 이상은 필드 전체를 버린다", () => {
  for (const types of ["12,12", "12,15", "32", "38", "12,14,28,39", "0", "999"]) {
    assert.deepEqual(parseRecreatePrefill({ sido: "11", types }), { sido: "11" }, types);
  }
});

test("유형: 숫자가 아니거나 형식이 틀리면 필드 전체를 버린다", () => {
  for (const types of ["", "abc", "12,abc", "12,", ",12", "12,,14", " 12", "12 ", "012", "+12", "-12", "1e1", "12.0", "0x0c", "12;14"]) {
    assert.deepEqual(parseRecreatePrefill({ sido: "11", types }), { sido: "11" }, JSON.stringify(types));
  }
});

test("같은 키가 여러 번 오면(배열) 그 필드는 없는 것으로 본다", () => {
  assert.deepEqual(parseRecreatePrefill({ sido: ["11", "26"], sigungu: "110", types: ["12", "14"] }), {});
  assert.deepEqual(parseRecreatePrefill({ sido: "11", sigungu: ["110", "140"] }), { sido: "11" });
});

test("정해진 세 키 밖의 값은 읽지 않는다. mood가 와도 결과에 없다", () => {
  const result = parseRecreatePrefill({ sido: "11", mood: "조용하고 한적한 곳", id: "x", extra: "1" });
  assert.deepEqual(result, { sido: "11" });
  assert.ok(!("mood" in result));
});

test("시도 목록과 맞춰 본다: 목록에 있으면 그대로", () => {
  assert.deepEqual(resolveFormPrefill({ sido: "11", sigungu: "110", types: [12] }, ["11", "26"]), {
    sido: "11",
    sigungu: "110",
    types: [12],
  });
});

test("시도 목록과 맞춰 본다: 목록에 없거나 목록을 쓸 수 없으면 시도와 시군구를 버리고 유형은 유지한다", () => {
  const prefill = { sido: "99", sigungu: "110", types: [12, 39] };
  assert.deepEqual(resolveFormPrefill(prefill, ["11", "26"]), { sido: "", sigungu: "", types: [12, 39] });
  assert.deepEqual(resolveFormPrefill(prefill, []), { sido: "", sigungu: "", types: [12, 39] });
  assert.deepEqual(resolveFormPrefill(prefill, undefined), { sido: "", sigungu: "", types: [12, 39] });
});

test("아무것도 없으면 빈 폼 값", () => {
  assert.deepEqual(resolveFormPrefill({}, ["11"]), { sido: "", sigungu: "", types: [] });
});
