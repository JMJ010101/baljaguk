// 지도에 찍을 장소 선택을 고정하는 단위 테스트다. 외부 호출은 0번이다.
// 실행: npx -y tsx@4.23.12 --conditions=react-server --test src/lib/course/mapStops.test.ts
import assert from "node:assert/strict";
import { test } from "node:test";
import { buildMapStops, isValidCoordinate } from "@/lib/course/mapStops";
import type { CoursePlace } from "@/lib/course/places";

const ok = (id: number, latitude?: number, longitude?: number, stale = false): CoursePlace =>
  ({
    kind: "ok",
    place: { id, contentTypeId: 12, title: `장소${id}`, latitude, longitude },
    detail: { placeId: id },
    stale,
  }) as CoursePlace;

const failed = (placeId: number): CoursePlace => ({ kind: "failed", placeId, reason: "unavailable" });

test("좌표 경계값: 위도 ±90, 경도 ±180은 올바르다", () => {
  assert.equal(isValidCoordinate(90, 180), true);
  assert.equal(isValidCoordinate(-90, -180), true);
  assert.equal(isValidCoordinate(90, -180), true);
  assert.equal(isValidCoordinate(-90, 180), true);
  assert.equal(isValidCoordinate(0, 0), true);
});

test("좌표 경계값: 범위 밖은 올바르지 않다", () => {
  assert.equal(isValidCoordinate(90.0001, 0), false);
  assert.equal(isValidCoordinate(-90.0001, 0), false);
  assert.equal(isValidCoordinate(0, 180.0001), false);
  assert.equal(isValidCoordinate(0, -180.0001), false);
  // 한국 좌표(위도 37, 경도 127 부근)를 뒤집어 넣으면 위도가 90을 넘어서 걸러진다.
  assert.equal(isValidCoordinate(127.03, 37.5), false);
  assert.equal(isValidCoordinate(200, 0), false);
  assert.equal(isValidCoordinate(0, 360), false);
});

test("좌표 경계값: undefined, NaN, Infinity는 올바르지 않다", () => {
  assert.equal(isValidCoordinate(undefined, 127), false);
  assert.equal(isValidCoordinate(37, undefined), false);
  assert.equal(isValidCoordinate(undefined, undefined), false);
  assert.equal(isValidCoordinate(Number.NaN, 127), false);
  assert.equal(isValidCoordinate(37, Number.NaN), false);
  assert.equal(isValidCoordinate(Number.POSITIVE_INFINITY, 127), false);
  assert.equal(isValidCoordinate(37, Number.NEGATIVE_INFINITY), false);
});

test("좌표가 있는 장소는 번호, 이름, 위도, 경도만 담긴다", () => {
  const result = buildMapStops([ok(1, 37.5, 127.0), ok(2, 37.6, 127.1)]);
  assert.deepEqual(result, {
    stops: [
      { order: 1, title: "장소1", latitude: 37.5, longitude: 127.0 },
      { order: 2, title: "장소2", latitude: 37.6, longitude: 127.1 },
    ],
    hiddenCount: 0,
  });
  assert.deepEqual(Object.keys(result.stops[0]).sort(), ["latitude", "longitude", "order", "title"]);
});

test("좌표가 없거나 범위 밖인 장소와 실패한 장소는 건너뛰고, 번호는 카드 순서를 유지한다", () => {
  const result = buildMapStops([
    ok(1, 37.5, 127.0),
    ok(2, undefined, undefined),
    ok(3, 37.6, undefined),
    failed(4),
    ok(5, 95, 127),
    ok(6, 90, 180),
  ]);
  assert.deepEqual(
    result.stops.map((s) => s.order),
    [1, 6],
  );
  assert.equal(result.hiddenCount, 4);
});

test("좌표 있는 장소가 0곳이면 stops는 비고 hiddenCount는 전체 수다", () => {
  assert.deepEqual(buildMapStops([ok(1), failed(2)]), { stops: [], hiddenCount: 2 });
  assert.deepEqual(buildMapStops([]), { stops: [], hiddenCount: 0 });
});

test("만료된 캐시(stale)의 장소도 좌표가 있으면 표시한다", () => {
  assert.equal(buildMapStops([ok(1, 37.5, 127.0, true)]).stops.length, 1);
});
