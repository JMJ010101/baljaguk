// 지역 이름 만들기를 고정하는 단위 테스트다. 외부 호출은 0번이다.
// 실행: npx -y tsx@4.23.12 --conditions=react-server --test src/lib/course/regionName.test.ts
import assert from "node:assert/strict";
import { test } from "node:test";
import { deriveRegionName } from "@/lib/course/generate";
import { regionNameFromAddress } from "@/lib/course/regionName";

test("시도만 고르면 주소의 첫 토큰", () => {
  assert.equal(regionNameFromAddress("서울특별시 종로구 낙산길 41", false), "서울특별시");
});

test("시군구까지 고르면 앞 두 토큰", () => {
  assert.equal(regionNameFromAddress("제주특별자치도 서귀포시 중문관광로 1", true), "제주특별자치도 서귀포시");
});

test("주소가 없거나 공백뿐이면 undefined", () => {
  assert.equal(regionNameFromAddress(undefined, false), undefined);
  assert.equal(regionNameFromAddress("   ", true), undefined);
});

test("토큰이 하나뿐이면 시군구를 골랐어도 그 하나", () => {
  assert.equal(regionNameFromAddress("세종특별자치시", true), "세종특별자치시");
});

test("deriveRegionName은 주소가 없을 때 지역 코드로 대신한다(프롬프트용)", () => {
  assert.equal(deriveRegionName(undefined, "11"), "지역 코드 11");
  assert.equal(deriveRegionName(undefined, "50", "130"), "지역 코드 50-130");
  assert.equal(deriveRegionName("서울특별시 중구 1", "11"), "서울특별시");
});
