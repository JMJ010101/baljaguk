// 관광공사 반려동물 동반여행 API(KorPetTourService2) 호출만 담당한다. 응답 변환은 normalize.ts에서 한다.
// 이 파일의 함수는 원본 item(들)만 돌려준다. 외부 호출은 자동 재시도하지 않는다.
// 목록 호출(areaBasedList2)에는 지역 필터로 lDongRegnCd(시도)와 lDongSignguCd(시군구)를 보낼 수 있다. 법정동 코드 조회(ldongCode2)는 fetchLdongCodes다.
import "server-only";
import { AppError } from "@/lib/errors";

const BASE_URL = "https://apis.data.go.kr/B551011/KorPetTourService2";
export const TOUR_TIMEOUT_MS = 8000;

// timeoutMs를 주면 그 값을 타임아웃으로 쓴다. 호출하는 쪽이 전체 예산에서 남은 시간으로 줄여서 넘긴다. 없으면 TOUR_TIMEOUT_MS다.
export type TourCallOptions = { timeoutMs?: number };
const MOBILE_OS = "ETC";
const MOBILE_APP = "baljaguk";

// 공공데이터포털 오류코드 (CLAUDE.md 표)
const CODE_CONNECTION_FAILED = 5;
const CODE_REQUEST_LIMIT_EXCEEDED = 22;

const MESSAGES = {
  API_TIMEOUT: "관광공사 서버 응답이 늦어지고 있어요. 잠시 후 다시 시도해 주세요.",
  RATE_LIMIT: "오늘 장소 조회 가능 횟수를 넘었어요. 내일 다시 시도해 주세요.",
  API_FAILED: "장소 정보를 불러오지 못했어요. 잠시 후 다시 시도해 주세요.",
} as const;

const STATUS = {
  API_TIMEOUT: 504,
  RATE_LIMIT: 429,
  API_FAILED: 502,
} as const;

function tourError(code: keyof typeof MESSAGES): AppError {
  return new AppError(code, MESSAGES[code], STATUS[code]);
}

// 오류코드를 숫자로 바꿔 비교한다. (05, 0005, 5 모두 5)
// TODO(확인 필요): 실제 응답에서 코드가 어떤 형태("05", "0005" 등)로 오는지 확인하지 못했다.
function errorFromCode(rawCode: string | number | undefined): AppError {
  const code = Number(rawCode);
  if (code === CODE_CONNECTION_FAILED) return tourError("API_TIMEOUT");
  if (code === CODE_REQUEST_LIMIT_EXCEEDED) return tourError("RATE_LIMIT");
  return tourError("API_FAILED");
}

function getServiceKey(): string {
  const key = process.env.TOUR_API_KEY;
  if (!key) throw tourError("API_FAILED");
  return key;
}

function buildUrl(operation: string, params: Record<string, string>): string {
  const key = getServiceKey();
  // 이미 인코딩된 키(%가 포함된 값)는 다시 인코딩하지 않는다.
  const serviceKey = key.includes("%") ? key : encodeURIComponent(key);
  const query = new URLSearchParams({
    MobileOS: MOBILE_OS,
    MobileApp: MOBILE_APP,
    _type: "json",
    ...params,
  });
  return `${BASE_URL}/${operation}?serviceKey=${serviceKey}&${query}`;
}

// 오류 응답은 _type=json을 줘도 XML로 온다. 본문에서 returnReasonCode만 읽는다.
function errorFromNonJson(text: string): AppError {
  const rawCode = text.match(/<returnReasonCode>\s*(.*?)\s*<\/returnReasonCode>/)?.[1];
  return errorFromCode(rawCode);
}

type TourResponse = {
  response?: {
    header?: { resultCode?: string | number };
    body?: { items?: unknown; totalCount?: unknown };
  };
  // 잘못된 서비스 키는 response가 아니라 이 모양으로 온다. (HTTP 403 + JSON, 호출 결과로 확인함)
  OpenAPI_ServiceResponse?: {
    cmmMsgHeader?: { returnReasonCode?: string | number };
  };
};

async function requestTour(
  operation: string,
  params: Record<string, string>,
  timeoutMs: number = TOUR_TIMEOUT_MS,
): Promise<TourResponse> {
  let text: string;
  try {
    const res = await fetch(buildUrl(operation, params), {
      signal: AbortSignal.timeout(timeoutMs),
    });
    text = await res.text();
  } catch (e) {
    // 에러 객체에는 요청 URL(키 포함)이 들어 있을 수 있어 메시지를 쓰지 않는다.
    const isTimeout = e instanceof Error && (e.name === "TimeoutError" || e.name === "AbortError");
    throw tourError(isTimeout ? "API_TIMEOUT" : "API_FAILED");
  }

  let json: TourResponse;
  try {
    json = JSON.parse(text) as TourResponse;
  } catch {
    throw errorFromNonJson(text);
  }

  // response.header가 없으면 오류 응답이다. cmmMsgHeader의 returnReasonCode를 같은 표로 변환한다.
  // cmmMsgHeader도 없으면 코드가 없는 것이라 errorFromCode가 API_FAILED로 만든다.
  // TODO(확인 필요): 이 JSON 오류 형태는 잘못된 서비스 키 한 경우에서만 확인했다. resultCode가 0000이 아닌 JSON 응답도 확인하지 못했다.
  const header = json?.response?.header;
  if (header === undefined) {
    throw errorFromCode(json?.OpenAPI_ServiceResponse?.cmmMsgHeader?.returnReasonCode);
  }
  if (header.resultCode !== undefined && Number(header.resultCode) !== 0) throw errorFromCode(header.resultCode);
  return json;
}

// items.item은 단건이면 객체, 여러 건이면 배열로 온다.
// TODO(확인 필요): 결과가 없는 정상 응답에서 items의 모양(빈 문자열 등)은 기록하지 못했다. (존재하지 않는 contentId는 resultCode 0000의 빈 items로 오는 것을 호출 결과로 확인함)
function extractItems(json: TourResponse): unknown[] {
  const items = json?.response?.body?.items;
  if (!items || typeof items !== "object") return [];
  const item = (items as { item?: unknown }).item;
  if (item === undefined || item === null || item === "") return [];
  return Array.isArray(item) ? item : [item];
}

// body.totalCount를 숫자로 꺼낸다. 없거나 숫자가 아니면 undefined이고 오류로 만들지 않는다.
// TODO(확인 필요): 매뉴얼 예제 기준이다. 실제 응답에서의 모양(숫자/문자열)은 확인하지 못했다.
function extractTotalCount(json: TourResponse): number | undefined {
  const raw = json?.response?.body?.totalCount;
  if (typeof raw === "number") return Number.isFinite(raw) ? raw : undefined;
  if (typeof raw !== "string" || raw.trim() === "") return undefined;
  const num = Number(raw);
  return Number.isFinite(num) ? num : undefined;
}

// contentTypeId, arrange, lDongRegnCd, lDongSignguCd는 값이 있을 때만 보낸다. 보내지 않으면 기존 요청과 같다.
// lDongSignguCd는 lDongRegnCd와 함께 보내야 한다. (매뉴얼: lDongRegnCd 필수) 지키는 것은 호출하는 쪽의 책임이다.
export async function fetchAreaBasedList(params: {
  numOfRows: number;
  pageNo: number;
  contentTypeId?: number;
  arrange?: string;
  lDongRegnCd?: string;
  lDongSignguCd?: string;
}, options?: TourCallOptions): Promise<{ items: unknown[]; totalCount?: number }> {
  const query: Record<string, string> = {
    numOfRows: String(params.numOfRows),
    pageNo: String(params.pageNo),
  };
  if (params.contentTypeId !== undefined) query.contentTypeId = String(params.contentTypeId);
  if (params.arrange !== undefined) query.arrange = params.arrange;
  if (params.lDongRegnCd !== undefined) query.lDongRegnCd = params.lDongRegnCd;
  if (params.lDongSignguCd !== undefined) query.lDongSignguCd = params.lDongSignguCd;
  const json = await requestTour("areaBasedList2", query, options?.timeoutMs);
  return { items: extractItems(json), totalCount: extractTotalCount(json) };
}

// 법정동 코드 조회(ldongCode2). lDongRegnCd가 없으면 시도 목록, 있으면 그 시도의 시군구 목록이다. (docs/manual.docx 오퍼레이션 10)
// lDongListYn은 보내지 않는다.
export async function fetchLdongCodes(params: {
  numOfRows: number;
  pageNo: number;
  lDongRegnCd?: string;
}, options?: TourCallOptions): Promise<{ items: unknown[]; totalCount?: number }> {
  const query: Record<string, string> = {
    numOfRows: String(params.numOfRows),
    pageNo: String(params.pageNo),
  };
  if (params.lDongRegnCd !== undefined) query.lDongRegnCd = params.lDongRegnCd;
  const json = await requestTour("ldongCode2", query, options?.timeoutMs);
  return { items: extractItems(json), totalCount: extractTotalCount(json) };
}

export async function fetchPetTourDetail(contentId: number, options?: TourCallOptions): Promise<unknown[]> {
  const json = await requestTour("detailPetTour2", { contentId: String(contentId) }, options?.timeoutMs);
  return extractItems(json);
}

  // contentTypeId는 필수다(매뉴얼 확인). 항상 함께 보낸다. (호출 결과로 확인함: 뺀 호출은 정상 응답을 받지 못했다.)
export async function fetchIntroDetail(
  contentId: number,
  contentTypeId: number,
  options?: TourCallOptions,
): Promise<unknown[]> {
  const json = await requestTour(
    "detailIntro2",
    {
      contentId: String(contentId),
      contentTypeId: String(contentTypeId),
    },
    options?.timeoutMs,
  );
  return extractItems(json);
}

// 공통정보(이름, 주소, 이미지, 좌표 등). 매뉴얼 Ver4.1상 요청은 contentId만 필요하고 contentTypeId는 요청 항목에 없다.
export async function fetchCommonDetail(contentId: number, options?: TourCallOptions): Promise<unknown[]> {
  const json = await requestTour("detailCommon2", { contentId: String(contentId) }, options?.timeoutMs);
  return extractItems(json);
}
