// ?course= 값 검증을 고정하는 단위 테스트다. 외부 호출은 0번이다.
// 실행: npx -y tsx@4.23.12 --conditions=react-server --test src/lib/course/courseLink.test.ts
import assert from "node:assert/strict";
import { test } from "node:test";
import { buildCourseBackHref, buildCourseShareUrl } from "@/lib/course/courseLink";

const ID = "6122d3c5-b0a3-4218-bcac-0cbfffca606b";

test("uuid면 /course/<uuid> 경로만 만든다", () => {
  assert.equal(buildCourseBackHref(ID), `/course/${ID}`);
});

test("외부 주소와 다른 경로는 받지 않는다", () => {
  for (const value of [
    "https://evil.example/x",
    "//evil.example",
    "/course/" + ID,
    "/places",
    "javascript:alert(1)",
    `${ID}/../..`,
    `${ID}?x=1`,
    `${ID}#x`,
    ` ${ID}`,
    `${ID} `,
    "../" + ID,
  ]) {
    assert.equal(buildCourseBackHref(value), undefined, value);
  }
});

test("uuid 모양이 아니면 받지 않는다", () => {
  for (const value of ["", "abc", "6122d3c5", "6122d3c5-b0a3-4218-bcac-0cbfffca606", "zzzzzzzz-b0a3-4218-bcac-0cbfffca606b"]) {
    assert.equal(buildCourseBackHref(value), undefined, value);
  }
});

test("값이 없거나 배열이면(?course=a&course=b) 받지 않는다", () => {
  assert.equal(buildCourseBackHref(undefined), undefined);
  assert.equal(buildCourseBackHref(null), undefined);
  assert.equal(buildCourseBackHref([ID, ID]), undefined);
});

test("링크 복사 주소: origin과 id만 쓰고 쿼리와 해시는 없다", () => {
  assert.equal(buildCourseShareUrl("https://baljaguk.example", ID), `https://baljaguk.example/course/${ID}`);
  assert.equal(buildCourseShareUrl("http://localhost:3000", ID), `http://localhost:3000/course/${ID}`);
  // origin에 경로나 쿼리가 섞여 있어도 origin만 쓴다.
  assert.equal(buildCourseShareUrl("https://baljaguk.example/places?mood=x#y", ID), `https://baljaguk.example/course/${ID}`);
});

test("링크 복사 주소: uuid가 아니면 만들지 않는다", () => {
  for (const id of ["", "abc", `${ID}?x=1`, `${ID}#x`, ` ${ID}`, "../" + ID]) {
    assert.equal(buildCourseShareUrl("https://baljaguk.example", id), undefined, id);
  }
});

test("링크 복사 주소: http(s)가 아닌 origin은 받지 않는다", () => {
  for (const origin of ["", "not a url", "javascript:alert(1)", "ftp://x.example", "data:text/plain,x"]) {
    assert.equal(buildCourseShareUrl(origin, ID), undefined, origin);
  }
});
