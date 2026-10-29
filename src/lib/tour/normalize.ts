// 가정: 입력은 응답(response.body.items.item)에서 이미 꺼낸 item 한 건이다. items가 비었거나 오류인 경우는 client.ts에서 처리한다.
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
  opentime: z.string().optional(),
  opentimefood: z.string().optional(),
  restdate: z.string().optional(),
  restdateshopping: z.string().optional(),
  restdatefood: z.string().optional(),
});

type IntroKey = keyof z.infer<typeof introSchema>;

// contentTypeId별 운영시간/쉬는 날 필드명. 호출 결과로 본 이름이고 의미는 매뉴얼로 확인하지 못했다.
// TODO(확인 필요): 28, 32, 14, 15 등 나머지 타입의 필드명
const INTRO_KEYS: Partial<Record<number, { hoursKey: IntroKey; restKey: IntroKey }>> = {
  12: { hoursKey: "usetime", restKey: "restdate" },
  38: { hoursKey: "opentime", restKey: "restdateshopping" },
  39: { hoursKey: "opentimefood", restKey: "restdatefood" },
};

export function getIntroKeys(contentTypeId: number) {
  return INTRO_KEYS[contentTypeId];
}

// 빈 문자열은 undefined로 바꾼다.
function emptyToUndefined(value: string | undefined): string | undefined {
  return value === undefined || value === "" ? undefined : value;
}

function parseOrThrow<T extends z.ZodType>(schema: T, raw: unknown): z.infer<T> {
  const result = schema.safeParse(raw);
  if (!result.success) {
    throw new AppError("API_FAILED", INVALID_RESPONSE_MESSAGE, INVALID_RESPONSE_STATUS);
  }
  return result.data;
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
