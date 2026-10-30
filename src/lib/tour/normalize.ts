// 가정: 상세 normalize의 입력은 응답(response.body.items.item)에서 이미 꺼낸 item 한 건이다. items가 비었거나 오류인 경우는 client.ts에서 처리한다.
import { z } from "zod";
import { AppError } from "@/lib/errors";
import type { Place, PlaceDetail } from "@/types";

const INVALID_RESPONSE_MESSAGE = "장소 정보를 불러오지 못했어요. 잠시 후 다시 시도해 주세요.";
const INVALID_RESPONSE_STATUS = 502;

// detailPetTour2 원본. 값이 없으면 빈 문자열("")로 온다.
const petTourSchema = z.object({
  acmpyTypeCd: z.string().optional(),
  acmpyPsblCpam: z.string().optional(),
  acmpyNeedMtr: z.string().optional(),
  etcAcmpyInfo: z.string().optional(),
  relaAcdntRiskMtr: z.string().optional(),
});

// detailIntro2 원본. 필드명이 타입마다 달라 운영시간·쉬는 날 후보만 정의하고 나머지는 무시한다.
const introSchema = z.object({
  usetime: z.string().optional(),
  usetimeculture: z.string().optional(),
  usetimeleports: z.string().optional(),
  opentime: z.string().optional(),
  opentimefood: z.string().optional(),
  restdate: z.string().optional(),
  restdateculture: z.string().optional(),
  restdateleports: z.string().optional(),
  restdateshopping: z.string().optional(),
  restdatefood: z.string().optional(),
});

type IntroKey = keyof z.infer<typeof introSchema>;

// contentTypeId별 운영시간/쉬는 날 필드명이다. 매뉴얼(Ver4.1 소개정보 조회)의 이름이고, 의미(이용시간/영업시간, 쉬는 날)도 매뉴얼에 있다.
// 12, 38, 39는 호출 결과로 확인했다. 14, 28도 각 1곳씩 호출해 이 필드가 값과 함께 오는 것을 확인했다(2026-10-30). 다른 장소는 확인하지 못했다.
// 15(행사: 행사 시작일/종료일, 공연시간, 이용요금)와 32(숙박: 입실/퇴실 시간)는 이용시간·쉬는 날 개념이 달라 매핑하지 않는다.
const INTRO_KEYS: Partial<Record<number, { hoursKey: IntroKey; restKey: IntroKey }>> = {
  12: { hoursKey: "usetime", restKey: "restdate" },
  14: { hoursKey: "usetimeculture", restKey: "restdateculture" },
  28: { hoursKey: "usetimeleports", restKey: "restdateleports" },
  38: { hoursKey: "opentime", restKey: "restdateshopping" },
  39: { hoursKey: "opentimefood", restKey: "restdatefood" },
};

export function getIntroKeys(contentTypeId: number) {
  return INTRO_KEYS[contentTypeId];
}

// 운영시간·쉬는 날을 읽는 타입인지다. false이면 화면에서 이 항목의 행을 보여주지 않는다. ("정보 없음"과 다르다.)
export function supportsOperatingInfo(contentTypeId: number): boolean {
  return INTRO_KEYS[contentTypeId] !== undefined;
}

// 빈 문자열은 undefined로 바꾼다.
function emptyToUndefined(value: string | undefined): string | undefined {
  return value === undefined || value === "" ? undefined : value;
}

// 숫자로 온 문자열을 숫자로 바꾼다. 비어 있거나 변환 결과가 NaN이면 undefined다.
function toNumber(value: string | undefined): number | undefined {
  const text = emptyToUndefined(value);
  if (text === undefined) return undefined;
  const num = Number(text);
  return Number.isNaN(num) ? undefined : num;
}

function invalidResponseError(): AppError {
  return new AppError("API_FAILED", INVALID_RESPONSE_MESSAGE, INVALID_RESPONSE_STATUS);
}

function parseOrThrow<T extends z.ZodType>(schema: T, raw: unknown): z.infer<T> {
  const result = schema.safeParse(raw);
  if (!result.success) throw invalidResponseError();
  return result.data;
}

// areaBasedList2 원본. 모두 문자열이고 값이 없으면 빈 문자열("")로 온다.
// 필수는 contentid, contenttypeid, title뿐이다. 나머지는 선택이다.
const placeListItemSchema = z.object({
  contentid: z.string().min(1),
  contenttypeid: z.string().min(1),
  title: z.string().min(1),
  addr1: z.string().optional(),
  addr2: z.string().optional(),
  areacode: z.string().optional(),
  cat1: z.string().optional(),
  cat2: z.string().optional(),
  cat3: z.string().optional(),
  createdtime: z.string().optional(),
  firstimage: z.string().optional(),
  firstimage2: z.string().optional(),
  cpyrhtDivCd: z.string().optional(),
  mapx: z.string().optional(),
  mapy: z.string().optional(),
  mlevel: z.string().optional(),
  modifiedtime: z.string().optional(),
  sigungucode: z.string().optional(),
  tel: z.string().optional(),
  zipcode: z.string().optional(),
  lDongRegnCd: z.string().optional(),
  lDongSignguCd: z.string().optional(),
  lclsSystm1: z.string().optional(),
  lclsSystm2: z.string().optional(),
  lclsSystm3: z.string().optional(),
});

// 좌표가 없는 장소도 버리지 않는다. 제외 여부는 호출하는 쪽이 latitude/longitude 유무로 정한다.
// mapx는 경도(longitude), mapy는 위도(latitude)다.
export function normalizePlace(raw: unknown): Place {
  const item = parseOrThrow(placeListItemSchema, raw);
  const id = toNumber(item.contentid);
  const contentTypeId = toNumber(item.contenttypeid);
  if (id === undefined || contentTypeId === undefined) throw invalidResponseError();

  return {
    id,
    contentTypeId,
    title: item.title,
    address: emptyToUndefined(item.addr1),
    longitude: toNumber(item.mapx),
    latitude: toNumber(item.mapy),
    imageUrl: emptyToUndefined(item.firstimage),
    imageCopyright: emptyToUndefined(item.cpyrhtDivCd),
    modifiedTime: emptyToUndefined(item.modifiedtime),
  };
}

export function normalizePlaceDetail(
  placeId: Place["id"],
  contentTypeId: Place["contentTypeId"],
  rawPetTour: unknown,
  rawIntro: unknown,
): PlaceDetail {
  const pet = parseOrThrow(petTourSchema, rawPetTour);
  const intro = parseOrThrow(introSchema, rawIntro);
  const keys = getIntroKeys(contentTypeId);

  return {
    placeId,
    acmpyTypeCd: emptyToUndefined(pet.acmpyTypeCd),
    acmpyPsblCpam: emptyToUndefined(pet.acmpyPsblCpam),
    acmpyNeedMtr: emptyToUndefined(pet.acmpyNeedMtr),
    etcAcmpyInfo: emptyToUndefined(pet.etcAcmpyInfo),
    relaAcdntRiskMtr: emptyToUndefined(pet.relaAcdntRiskMtr),
    hours: keys ? emptyToUndefined(intro[keys.hoursKey]) : undefined,
    rest: keys ? emptyToUndefined(intro[keys.restKey]) : undefined,
  };
}
