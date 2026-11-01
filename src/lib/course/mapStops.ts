// 코스 결과 지도에 찍을 장소를 고른다. 이미 읽은 장소 데이터의 좌표만 쓰고 외부 호출은 하지 않는다.
// 번호는 카드의 순서 번호와 같다. (전체 장소 목록에서의 위치 + 1) 좌표가 없거나 가져오지 못한 장소는 지도에서만 건너뛰고 번호는 유지한다.
// 클라이언트 컴포넌트에 넘기는 값이라 번호, 이름, 위도, 경도만 담는다. (장소 상세와 분위기는 담지 않는다)
import type { CoursePlace } from "@/lib/course/places";

export type MapStop = { order: number; title: string; latitude: number; longitude: number };
export type MapStops = {
  stops: MapStop[];
  // 지도에 표시하지 않은 장소 수(좌표가 없거나 올바르지 않은 장소, 정보를 가져오지 못한 장소)
  hiddenCount: number;
};

const LATITUDE_LIMIT = 90;
const LONGITUDE_LIMIT = 180;

// WGS84 범위(위도 -90~90, 경도 -180~180, 경계 포함) 안의 유한한 숫자일 때만 올바른 좌표로 본다.
export function isValidCoordinate(latitude: number | undefined, longitude: number | undefined): boolean {
  if (latitude === undefined || longitude === undefined) return false;
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return false;
  return Math.abs(latitude) <= LATITUDE_LIMIT && Math.abs(longitude) <= LONGITUDE_LIMIT;
}

export function buildMapStops(places: readonly CoursePlace[]): MapStops {
  const stops: MapStop[] = [];
  places.forEach((stop, index) => {
    if (stop.kind !== "ok") return;
    const { title, latitude, longitude } = stop.place;
    if (latitude === undefined || longitude === undefined || !isValidCoordinate(latitude, longitude)) return;
    stops.push({ order: index + 1, title, latitude, longitude });
  });
  return { stops, hiddenCount: places.length - stops.length };
}
