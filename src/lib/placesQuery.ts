// 장소 탐색 화면의 URL 쿼리(?sido=&type=&page=)를 다루는 순수 함수들이다.
// 클라이언트에서도 쓰므로 server-only 파일을 import하지 않는다.
import { CONTENT_TYPE_IDS, DEFAULT_CONTENT_TYPE_ID } from "@/lib/tour/contentTypes";

// 한 페이지에 보여줄 장소 수다. 요청에 항상 명시하고, 페이지 수 계산에도 이 값을 쓴다.
export const PAGE_SIZE = 20;
const DEFAULT_PAGE = 1;
const PAGE_PATTERN = /^\d+$/;

// 세종특별자치시의 시도 코드가 5자리(36110)라 1~5자리 숫자를 허용한다. API route와 regions.ts도 이 값을 쓴다.
export const SIDO_CODE_PATTERN = /^\d{1,5}$/;

export type PlacesQuery = {
  sido?: string;
  type: number;
  page: number;
};

export const DEFAULT_QUERY: PlacesQuery = { type: DEFAULT_CONTENT_TYPE_ID, page: DEFAULT_PAGE };

type QueryParams = { get(name: string): string | null };

// 잘못된 값은 오류로 만들지 않고 기본값으로 처리한다.
function parseWith(params: QueryParams, isValidSido: (code: string) => boolean): PlacesQuery {
  const sido = params.get("sido");
  const type = Number(params.get("type"));
  const page = params.get("page");

  return {
    sido: sido !== null && isValidSido(sido) ? sido : undefined,
    type: CONTENT_TYPE_IDS.includes(type) ? type : DEFAULT_CONTENT_TYPE_ID,
    page: page !== null && PAGE_PATTERN.test(page) && Number(page) >= DEFAULT_PAGE ? Number(page) : DEFAULT_PAGE,
  };
}

// 목록 화면용이다. sido는 시도 목록에 있는 코드일 때만 받는다. 목록을 쓸 수 없으면 validSidoCodes를 비워 넘긴다.
export function parsePlacesQuery(params: QueryParams, validSidoCodes: readonly string[]): PlacesQuery {
  return parseWith(params, (code) => validSidoCodes.includes(code));
}

// 상세 화면의 "목록으로" 링크용이다. 시도 목록을 부르지 않고 형식만 확인한다.
export function parseBackQuery(params: QueryParams): PlacesQuery {
  return parseWith(params, (code) => SIDO_CODE_PATTERN.test(code));
}

// 기본값은 URL에서 생략한다.
function buildSearch(query: PlacesQuery): string {
  const search = new URLSearchParams();
  if (query.sido !== undefined) search.set("sido", query.sido);
  if (query.type !== DEFAULT_CONTENT_TYPE_ID) search.set("type", String(query.type));
  if (query.page !== DEFAULT_PAGE) search.set("page", String(query.page));
  return search.toString();
}

export function buildPlacesHref(query: PlacesQuery): string {
  const text = buildSearch(query);
  return text === "" ? "/places" : `/places?${text}`;
}

// 목록의 선택 값을 상세 주소에 실어 보낸다. 상세의 "목록으로"가 같은 필터로 돌아가게 한다.
export function buildPlaceDetailHref(placeId: number, query: PlacesQuery): string {
  const text = buildSearch(query);
  return text === "" ? `/places/${placeId}` : `/places/${placeId}?${text}`;
}

export function buildPlacesApiUrl(query: PlacesQuery): string {
  const search = new URLSearchParams({
    numOfRows: String(PAGE_SIZE),
    pageNo: String(query.page),
    contentTypeId: String(query.type),
  });
  if (query.sido !== undefined) search.set("sido", query.sido);
  return `/api/places?${search.toString()}`;
}

export function getPageCount(totalCount: number): number {
  return Math.ceil(totalCount / PAGE_SIZE);
}
