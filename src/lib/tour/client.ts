// 관광공사 반려동물 동반여행 API(KorPetTourService2) 호출만 담당한다. 응답 변환은 normalize.ts에서 한다.
// 이 파일의 함수는 원본 item(들)만 돌려준다. 외부 호출은 자동 재시도하지 않는다.
// TODO(확인 필요): 지역 코드, 정렬 파라미터는 매뉴얼 확인 후 추가
import "server-only";
import { AppError } from "@/lib/errors";

const BASE_URL = "https://apis.data.go.kr/B551011/KorPetTourService2";
const TOUR_TIMEOUT_MS = 8000;
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
    body?: { items?: unknown };
  };
};

async function requestTour(operation: string, params: Record<string, string>): Promise<TourResponse> {
  let text: string;
  try {
    const res = await fetch(buildUrl(operation, params), {
      signal: AbortSignal.timeout(TOUR_TIMEOUT_MS),
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

  // TODO(확인 필요): resultCode가 0000이 아닌 JSON 응답은 실제로 확인하지 못했다.
  const resultCode = json?.response?.header?.resultCode;
  if (resultCode !== undefined && Number(resultCode) !== 0) throw errorFromCode(resultCode);
  return json;
}

// items.item은 단건이면 객체, 여러 건이면 배열로 온다.
// TODO(확인 필요): 결과가 없는 정상 응답에서 items의 모양(빈 문자열 등)은 실제로 확인하지 못했다.
function extractItems(json: TourResponse): unknown[] {
  const items = json?.response?.body?.items;
  if (!items || typeof items !== "object") return [];
  const item = (items as { item?: unknown }).item;
  if (item === undefined || item === null || item === "") return [];
  return Array.isArray(item) ? item : [item];
}

export async function fetchAreaBasedList(params: { numOfRows: number; pageNo: number }): Promise<unknown[]> {
  const json = await requestTour("areaBasedList2", {
    numOfRows: String(params.numOfRows),
    pageNo: String(params.pageNo),
  });
  return extractItems(json);
}

export async function fetchPetTourDetail(contentId: number): Promise<unknown[]> {
  const json = await requestTour("detailPetTour2", { contentId: String(contentId) });
  return extractItems(json);
}

// contentTypeId를 항상 함께 보낸다. (뺀 호출은 정상 응답을 받지 못했다. 필수인지 매뉴얼로는 확인하지 못했다.)
export async function fetchIntroDetail(contentId: number, contentTypeId: number): Promise<unknown[]> {
  const json = await requestTour("detailIntro2", {
    contentId: String(contentId),
    contentTypeId: String(contentTypeId),
  });
  return extractItems(json);
}
