// 장소 탐색 화면의 URL 쿼리(?sido=&type=&page=)를 다루는 순수 함수들이다.
// 클라이언트에서도 쓰므로 server-only 파일을 import하지 않는다.
import { CONTENT_TYPE_IDS, DEFAULT_CONTENT_TYPE_ID } from "@/lib/tour/contentTypes";

// 한 페이지에 보여줄 장소 수다. 요청에 항상 명시하고, 페이지 수 계산에도 이 값을 쓴다.
export const PAGE_SIZE = 20;
const DEFAULT_PAGE = 1;
const PAGE_PATTERN = /^\d+$/;

export type PlacesQuery = {
  sido?: string;
  type: number;
  page: number;
};

export const DEFAULT_QUERY: PlacesQuery = { type: DEFAULT_CONTENT_TYPE_ID, page: DEFAULT_PAGE };

// 잘못된 값은 오류로 만들지 않고 기본값으로 처리한다.
// sido는 시도 목록에 있는 코드일 때만 받는다. 목록을 쓸 수 없으면 validSidoCodes를 비워 넘긴다.
export function parsePlacesQuery(
  params: { get(name: string): string | null },
  validSidoCodes: readonly string[],
): PlacesQuery {
  const sido = params.get("sido");
  const type = Number(params.get("type"));
  const page = params.get("page");

  return {
    sido: sido !== null && validSidoCodes.includes(sido) ? sido : undefined,
    type: CONTENT_TYPE_IDS.includes(type) ? type : DEFAULT_CONTENT_TYPE_ID,
    page: page !== null && PAGE_PATTERN.test(page) && Number(page) >= DEFAULT_PAGE ? Number(page) : DEFAULT_PAGE,
  };
}

// 기본값은 URL에서 생략한다.
export function buildPlacesHref(query: PlacesQuery): string {
  const search = new URLSearchParams();
  if (query.sido !== undefined) search.set("sido", query.sido);
  if (query.type !== DEFAULT_CONTENT_TYPE_ID) search.set("type", String(query.type));
  if (query.page !== DEFAULT_PAGE) search.set("page", String(query.page));
  const text = search.toString();
  return text === "" ? "/places" : `/places?${text}`;
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
