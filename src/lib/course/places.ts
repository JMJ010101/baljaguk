// 코스 결과 화면이 쓰는 장소 조회다. 코스는 placeId만 저장하므로 장소마다 캐시에서 읽는다.
// 캐시 행이 있으면 만료됐어도 그대로 쓰고(stale 표시), 관광공사는 부르지 않는다. 행이 없을 때만 getPlaceDetail로 채운다.
// 모든 장소를 동시에 조회한다. 호출 한도는 코스 한 번 열 때 한 번만 센다. (장소마다 세면 places 분당 한도에 걸린다)
// TODO(확인 필요): 캐시 행이 없을 때의 폴백은 공개 링크를 열기만 해도 관광공사 호출 한도를 쓸 수 있다. 캐시 행이 지워지는 경로는 코드에서 찾지 못했다.
import "server-only";
import { getCachedPlaceAnyAge } from "@/lib/db/placeCache";
import { AppError } from "@/lib/errors";
import { getPlaceDetail } from "@/lib/tour/placeDetail";
import type { Place, PlaceDetail } from "@/types";

export type CoursePlace =
  | { kind: "ok"; place: Place; detail: PlaceDetail; stale: boolean }
  // not-found: 관광공사에 더 이상 없는 장소 / unavailable: 지금은 불러오지 못함
  | { kind: "failed"; placeId: number; reason: "not-found" | "unavailable" };

export type CoursePlacesResult =
  | { ok: true; places: CoursePlace[] }
  // 코스 전체를 오류로 보여 줄 때다. message는 RATE_LIMIT일 때만 서버 문구를 담는다.
  | { ok: false; code: "DB_UNAVAILABLE" | "RATE_LIMIT" | "API_FAILED"; message?: string };

// 테스트에서 외부 호출을 바꿔 끼울 수 있게 한다.
export type CoursePlacesDeps = {
  getCachedPlaceAnyAge: typeof getCachedPlaceAnyAge;
  getPlaceDetail: typeof getPlaceDetail;
};
const defaultDeps: CoursePlacesDeps = { getCachedPlaceAnyAge, getPlaceDetail };

type Settled = { ok: true; value: CoursePlace } | { ok: false; error: unknown };

export async function loadCoursePlaces(
  placeIds: number[],
  // 캐시에 없는 장소가 처음 나왔을 때 한 번만 부른다. 호출 한도(rateLimit)를 여기에 연결한다. 던지면 그 장소들은 RATE_LIMIT으로 실패한다.
  options: { beforeTourCalls?: () => Promise<void> } = {},
  deps: CoursePlacesDeps = defaultDeps,
): Promise<CoursePlacesResult> {
  let limitCheck: Promise<void> | undefined;
  const checkLimitOnce = () => {
    limitCheck ??= options.beforeTourCalls?.() ?? Promise.resolve();
    return limitCheck;
  };

  const loadOne = async (placeId: number): Promise<CoursePlace> => {
    const found = await deps.getCachedPlaceAnyAge(placeId);
    if (found !== null) return { kind: "ok", place: found.cached.place, detail: found.cached.detail, stale: found.expired };
    await checkLimitOnce();
    // 한도는 위에서 이미 셌으므로 beforeTourCalls는 넘기지 않는다.
    const { place, detail } = await deps.getPlaceDetail(placeId);
    return { kind: "ok", place, detail, stale: false };
  };

  const settled: Settled[] = await Promise.all(
    placeIds.map((placeId) =>
      loadOne(placeId).then(
        (value): Settled => ({ ok: true, value }),
        (error: unknown): Settled => ({ ok: false, error }),
      ),
    ),
  );

  // AppError가 아닌 예외는 삼키지 않고 app/error.tsx에 맡긴다.
  const errors = settled.flatMap((entry) => (entry.ok ? [] : [entry.error]));
  for (const error of errors) if (!(error instanceof AppError)) throw error;
  const appErrors = errors as AppError[];

  // 캐시 읽기나 쓰기가 DB 오류이면 DB 전체가 문제라고 보고 코스 전체를 오류로 보여 준다.
  if (appErrors.some((error) => error.code === "DB_UNAVAILABLE")) return { ok: false, code: "DB_UNAVAILABLE" };

  if (placeIds.length > 0 && appErrors.length === placeIds.length) {
    const limited = appErrors.find((error) => error.code === "RATE_LIMIT");
    if (limited !== undefined) return { ok: false, code: "RATE_LIMIT", message: limited.userMessage };
    return { ok: false, code: "API_FAILED" };
  }

  return {
    ok: true,
    places: settled.map((entry, index): CoursePlace => {
      if (entry.ok) return entry.value;
      const notFound = entry.error instanceof AppError && entry.error.code === "INVALID_INPUT";
      return { kind: "failed", placeId: placeIds[index], reason: notFound ? "not-found" : "unavailable" };
    }),
  };
}
