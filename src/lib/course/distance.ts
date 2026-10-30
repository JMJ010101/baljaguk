// 두 좌표 사이의 거리(미터)를 코드가 계산한다. AI에게 계산을 맡기지 않는다. (CLAUDE.md)
const EARTH_RADIUS_METERS = 6_371_000;
const DEGREES_TO_RADIANS = Math.PI / 180;

type Point = { latitude: number; longitude: number };

// 하버사인 공식(WGS84 위도·경도 기준, 지구를 구로 근사)이다.
export function haversineMeters(a: Point, b: Point): number {
  const dLat = (b.latitude - a.latitude) * DEGREES_TO_RADIANS;
  const dLon = (b.longitude - a.longitude) * DEGREES_TO_RADIANS;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(a.latitude * DEGREES_TO_RADIANS) * Math.cos(b.latitude * DEGREES_TO_RADIANS) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_METERS * Math.asin(Math.sqrt(h));
}
