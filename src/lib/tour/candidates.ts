import { AppError } from "@/lib/errors";
import {
  ANCHOR_ATTEMPTS,
  ANCHOR_PREFERRED_TYPE_ID,
  AREA_LIST_NUM_OF_ROWS,
  MAX_POOL,
  MAX_SELECTED_TYPES,
  MIN_POOL,
  PER_TYPE_LIMIT,
  RADIUS_LADDER_METERS,
} from "@/lib/course/constants";
import { haversineMeters } from "@/lib/course/distance";
import type { CandidatePool, CourseCandidate, MissingType } from "@/lib/course/types";
import { SIDO_CODE_PATTERN } from "@/lib/placesQuery";
import { fetchAreaBasedList } from "@/lib/tour/client";
import { COURSE_CONTENT_TYPE_IDS } from "@/lib/tour/contentTypes";
import { normalizePlace } from "@/lib/tour/normalize";
import type { Place } from "@/types";

const INVALID_INPUT_MESSAGE = "요청 값이 올바르지 않아요. 다시 확인해 주세요.";
const INVALID_INPUT_STATUS = 400;
const INSUFFICIENT_MESSAGE = "조건에 맞는 장소가 부족해요. 지역을 넓히거나 유형을 바꿔 보세요.";
const INSUFFICIENT_STATUS = 422;

type Located = Place & { latitude: number; longitude: number };

function hasCoordinates(place: Place): place is Located {
  return place.latitude !== undefined && place.longitude !== undefined;
}

// Fisher-Yates 섞기. random은 확인용으로 바꿀 수 있다.
function shuffled<T>(items: readonly T[], random: () => number): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function invalidInput(): AppError {
  return new AppError("INVALID_INPUT", INVALID_INPUT_MESSAGE, INVALID_INPUT_STATUS);
}

type TypeList = { typeId: number; places: Located[]; truncated: boolean };

// 한 기준점과 한 반경으로 만든 후보 묶음이다.
type Attempt = {
  anchor: Located;
  radiusMeters: number;
  candidates: CourseCandidate[];
  coveredTypeIds: Set<number>;
};

function buildAttempt(anchor: Located, radiusMeters: number, lists: TypeList[]): Attempt {
  const candidates: CourseCandidate[] = [];
  const coveredTypeIds = new Set<number>();
  for (const list of lists) {
    const near = list.places
      .map((place) => ({ ...place, distanceMeters: Math.round(haversineMeters(anchor, place)) }))
      .filter((place) => place.distanceMeters <= radiusMeters)
      .sort((a, b) => a.distanceMeters - b.distanceMeters)
      .slice(0, PER_TYPE_LIMIT);
    if (near.length > 0) coveredTypeIds.add(list.typeId);
    candidates.push(...near);
  }
  return { anchor, radiusMeters, candidates: candidates.slice(0, MAX_POOL), coveredTypeIds };
}

// 유형별로 지역 목록을 한 번씩 받아 기준점을 고르고, 기준점에서 가까운 후보를 모은다.
// - 지역(시도, 시군구)은 관광공사 API 파라미터로 거른다. 반경 안의 장소는 코드가 거리를 계산해서 고른다.
//   (위치기반 조회는 목록에 있는 장소를 절반도 찾지 못해서 쓰지 않는다. 측정 결과는 단계 1 보고 참고)
// - 기준점은 관광지(12) 목록이 있으면 거기서, 없으면 다른 유형 목록에서 무작위로 고른다.
// - 선택한 유형마다 최소 1곳은 "그 지역에 장소가 있는 유형"에만 적용하는 완화된 hard 조건이다. 없는 유형은 missingTypes로 알린다.
// - 기준점 ANCHOR_ATTEMPTS개 x 반경 목록을 모두 계산하고, 후보가 MIN_POOL 이상인 것 중 가장 많은 유형을 덮는 것을 고른다.
export async function collectCandidates(params: {
  sido: string;
  sigungu?: string;
  types: number[];
  random?: () => number;
}): Promise<CandidatePool> {
  const { sido, sigungu, types, random = Math.random } = params;

  if (!SIDO_CODE_PATTERN.test(sido)) throw invalidInput();
  if (sigungu !== undefined && !SIDO_CODE_PATTERN.test(sigungu)) throw invalidInput();
  if (types.length < 1 || types.length > MAX_SELECTED_TYPES || new Set(types).size !== types.length) throw invalidInput();
  if (!types.every((id) => COURSE_CONTENT_TYPE_IDS.includes(id))) throw invalidInput();

  let skipped = 0;
  const lists: TypeList[] = await Promise.all(
    types.map(async (typeId) => {
      const { items, totalCount } = await fetchAreaBasedList({
        numOfRows: AREA_LIST_NUM_OF_ROWS,
        pageNo: 1,
        contentTypeId: typeId,
        lDongRegnCd: sido,
        lDongSignguCd: sigungu,
      });
      const places: Located[] = [];
      for (const raw of items) {
        try {
          const place = normalizePlace(raw);
          if (hasCoordinates(place)) places.push(place);
        } catch {
          skipped++;
        }
      }
      return { typeId, places, truncated: totalCount !== undefined && totalCount > items.length };
    }),
  );

  // 기준점 후보: 관광지 목록이 있으면 그 목록, 없으면 다른 유형 목록 전체
  const preferred = lists.find((list) => list.typeId === ANCHOR_PREFERRED_TYPE_ID && list.places.length > 0);
  const anchorSource = preferred ? preferred.places : lists.flatMap((list) => list.places);
  if (anchorSource.length === 0) throw new AppError("INVALID_INPUT", INSUFFICIENT_MESSAGE, INSUFFICIENT_STATUS);
  const anchors = shuffled(anchorSource, random).slice(0, ANCHOR_ATTEMPTS);

  const typesWithData = new Set(lists.filter((list) => list.places.length > 0).map((list) => list.typeId));
  let best: Attempt | undefined;
  for (const radiusMeters of RADIUS_LADDER_METERS) {
    for (const anchor of anchors) {
      const attempt = buildAttempt(anchor, radiusMeters, lists);
      if (attempt.candidates.length < MIN_POOL) continue;
      // 더 많은 유형을 덮는 쪽, 같으면 더 작은 반경(앞서 시도한 쪽), 같으면 후보가 더 많은 쪽
      if (
        best === undefined ||
        attempt.coveredTypeIds.size > best.coveredTypeIds.size ||
        (attempt.coveredTypeIds.size === best.coveredTypeIds.size &&
          attempt.radiusMeters === best.radiusMeters &&
          attempt.candidates.length > best.candidates.length)
      ) {
        best = attempt;
      }
    }
  }
  if (best === undefined) throw new AppError("INVALID_INPUT", INSUFFICIENT_MESSAGE, INSUFFICIENT_STATUS);

  const missingTypes: MissingType[] = types
    .filter((typeId) => !best.coveredTypeIds.has(typeId))
    .map((contentTypeId) => ({
      contentTypeId,
      reason: typesWithData.has(contentTypeId) ? "out-of-range" : "no-data",
    }));

  return {
    anchor: best.anchor,
    radiusMeters: best.radiusMeters,
    candidates: best.candidates,
    missingTypes,
    listedCounts: Object.fromEntries(lists.map((list) => [list.typeId, list.places.length])),
    truncatedTypeIds: lists.filter((list) => list.truncated).map((list) => list.typeId),
    skipped,
  };
}
