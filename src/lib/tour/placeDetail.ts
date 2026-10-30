import { DB_TIMEOUT_MS } from "@/lib/db/client";
import { getCachedPlace, setCachedPlace, type CachedPlace } from "@/lib/db/placeCache";
import { stepTimeoutMs } from "@/lib/deadline";
import { AppError } from "@/lib/errors";
import {
  fetchCommonDetail,
  fetchIntroDetail,
  fetchPetTourDetail,
  TOUR_TIMEOUT_MS,
} from "@/lib/tour/client";
import { normalizePlace, normalizePlaceDetail } from "@/lib/tour/normalize";

const NOT_FOUND_MESSAGE = "존재하지 않는 장소예요";
const NOT_FOUND_STATUS = 404;
const API_FAILED_MESSAGE = "장소 정보를 불러오지 못했어요. 잠시 후 다시 시도해 주세요.";
const API_FAILED_STATUS = 502;

// 빈 items는 빈 객체로 대신한다. 모든 필드가 undefined인 "정보 없음" 상세가 된다.
// 이 경로는 실제 호출로 확인하지 못했다. 정상 응답인지 일시적인 빈 응답인지 구분하지 못하며, 그대로 캐시에 저장된다.
function firstItemOrEmpty(operation: string, placeId: number, items: unknown[]): unknown {
  if (items.length > 0) return items[0];
  console.warn(`${operation} 응답이 비어 있어 정보 없음으로 처리: place_id=${placeId}`);
  return {};
}

// 캐시 -> detailCommon2 -> (detailPetTour2 + detailIntro2) -> 캐시 저장 순서다.
// 캐시나 DB 오류는 삼키지 않고 DB_UNAVAILABLE로 던진다. 한쪽 호출이 실패하면 전체가 실패하고 캐시에 저장하지 않는다.
// options를 주지 않으면 각 호출은 자기 타임아웃 상수를 쓴다. 코스 생성은 deadlineAt(전체 예산의 마감 시각)과
// reserveMs(뒤 단계를 위해 남겨 둘 시간)를 줘서 각 호출의 타임아웃을 남은 예산으로 줄인다.
export async function getPlaceDetail(
  placeId: number,
  options?: { deadlineAt?: number; reserveMs?: number },
): Promise<CachedPlace> {
  const step = (ownMs: number) => stepTimeoutMs(ownMs, options?.deadlineAt, options?.reserveMs);

  const cached = await getCachedPlace(placeId, { timeoutMs: step(DB_TIMEOUT_MS) });
  if (cached) return cached;

  const [commonItem] = await fetchCommonDetail(placeId, { timeoutMs: step(TOUR_TIMEOUT_MS) });
  if (commonItem === undefined) {
    throw new AppError("INVALID_INPUT", NOT_FOUND_MESSAGE, NOT_FOUND_STATUS);
  }
  const place = normalizePlace(commonItem);
  // 응답의 id가 요청한 id와 다르면 캐시에 저장해도 적중하지 않으므로 여기서 멈춘다.
  // 이 경로는 실제 응답으로 확인하지 못했다. 이 값이 다르게 오는 경우를 본 적이 없다.
  if (place.id !== placeId) {
    console.error(`detailCommon2 응답 id가 요청과 다름: 요청=${placeId} 응답=${place.id}`);
    throw new AppError("API_FAILED", API_FAILED_MESSAGE, API_FAILED_STATUS);
  }

  const detailTimeoutMs = step(TOUR_TIMEOUT_MS);
  const [petItems, introItems] = await Promise.all([
    fetchPetTourDetail(place.id, { timeoutMs: detailTimeoutMs }),
    fetchIntroDetail(place.id, place.contentTypeId, { timeoutMs: detailTimeoutMs }),
  ]);
  const detail = normalizePlaceDetail(
    place.id,
    place.contentTypeId,
    firstItemOrEmpty("detailPetTour2", place.id, petItems),
    firstItemOrEmpty("detailIntro2", place.id, introItems),
  );

  await setCachedPlace(place, detail, { timeoutMs: step(DB_TIMEOUT_MS) });
  return { place, detail };
}
