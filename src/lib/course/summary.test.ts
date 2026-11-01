// 코스 결과 안내 문구를 고정하는 단위 테스트다. 외부 호출은 0번이다.
// 실행: npx -y tsx@4.23.12 --conditions=react-server --test src/lib/course/summary.test.ts
import assert from "node:assert/strict";
import { test } from "node:test";
import { missingTypeNotices, placeCountLabel } from "@/lib/course/summary";

test("빠진 유형이 없으면 안내도 없다", () => {
  assert.deepEqual(missingTypeNotices([]), []);
});

test("이유별로 문구가 다르고, 유형 순서를 유지한다", () => {
  assert.deepEqual(
    missingTypeNotices([
      { contentTypeId: 28, reason: "no-data" },
      { contentTypeId: 39, reason: "out-of-range" },
    ]),
    ["레포츠 장소가 이 지역에 없어서 빼고 만들었어요.", "음식점 장소가 가까운 곳에 없어서 빼고 만들었어요."],
  );
});

test("이름을 모르는 유형은 건너뛴다", () => {
  assert.deepEqual(missingTypeNotices([{ contentTypeId: 999, reason: "no-data" }]), []);
});

test("장소 수 문구", () => {
  assert.equal(placeCountLabel(4), "장소 4곳");
});
