import type { Place } from "@/types";

// 기준점으로부터의 거리는 기준점마다 값이 달라서 Place가 아니라 코스 후보에 둔다. (캐시에도 저장하지 않는다)
export type CourseCandidate = Place & { distanceMeters: number };

// 사용자가 고른 유형인데 후보에 없는 경우다.
// "선택한 유형마다 최소 1곳"은 후보에 있는 유형에만 적용하는 hard 조건 완화(사용자 결정, 2026-10-31)이고, 없는 유형은 결과에 안내한다.
// no-data: 그 지역 목록에 장소가 아예 없음 / out-of-range: 지역에는 있지만 선택한 반경 안에 없음
export type MissingType = { contentTypeId: number; reason: "no-data" | "out-of-range" };

export type CandidatePool = {
  // 기준점 장소. 기준점 id는 courses.input에 저장한다.
  anchor: Place;
  radiusMeters: number;
  // 선택한 유형 순서, 같은 유형 안에서는 기준점에서 가까운 순
  candidates: CourseCandidate[];
  missingTypes: MissingType[];
  // 유형별로 지역 목록에서 받은 건수(좌표 있는 것)
  listedCounts: Record<number, number>;
  // 지역 목록의 전체 수가 한 번에 받은 건수보다 많아 일부만 본 유형
  truncatedTypeIds: number[];
  // normalize에 실패해서 건너뛴 항목 수
  skipped: number;
};

// 화면과 공유 링크가 쓰는 코스 타입이다. 화면 코드는 이 타입만 쓴다.
// 사용자가 쓴 분위기(mood)와 내부 정보(프로필 스냅샷, 기준점, 반경, 프롬프트 버전)는 담지 않는다.
export type PublicCourse = {
  id: string;
  createdAt: string;
  sido: string;
  sigungu?: string;
  types: number[];
  // 후보가 없어서 빼고 만든 유형. 화면은 이것으로 안내 문구를 만든다.
  missingTypes: MissingType[];
  // 순서 있는 장소 id
  placeIds: number[];
};
