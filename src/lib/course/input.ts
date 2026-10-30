// 코스 생성 요청의 입력 검증이다. 검증에 실패하면 외부 호출 없이 INVALID_INPUT 400이다. 코스 만들기 폼도 같은 스키마를 쓴다.
import { z } from "zod";
import { MOOD_MAX_LENGTH } from "@/lib/ai/constants";
import { MAX_SELECTED_TYPES } from "@/lib/course/constants";
import { AppError } from "@/lib/errors";
import { SIDO_CODE_PATTERN } from "@/lib/placesQuery";
import { COURSE_CONTENT_TYPE_IDS } from "@/lib/tour/contentTypes";

// 공백을 정리하기 전 입력의 상한이다. 너무 긴 입력은 정리하기 전에 거절한다.
const MOOD_RAW_MAX_LENGTH = 1000;
const INVALID_INPUT_MESSAGE = "요청 값이 올바르지 않아요. 다시 확인해 주세요.";
const INVALID_INPUT_STATUS = 400;

const regionCode = z.string().regex(SIDO_CODE_PATTERN);

const typesSchema = z
  .array(z.number().int())
  .min(1)
  .max(MAX_SELECTED_TYPES)
  .refine((ids) => new Set(ids).size === ids.length, "중복된 유형")
  .refine((ids) => ids.every((id) => COURSE_CONTENT_TYPE_IDS.includes(id)), "허용하지 않는 유형");

// 줄바꿈과 반복 공백을 한 칸으로 줄인 뒤 길이를 본다. 넘으면 자르지 않고 거절한다. 빈 문자열은 없는 것으로 본다.
const moodSchema = z
  .string()
  .max(MOOD_RAW_MAX_LENGTH)
  .transform((text) => text.replace(/\s+/g, " ").trim())
  .pipe(z.string().max(MOOD_MAX_LENGTH))
  .transform((text) => (text === "" ? undefined : text));

export const courseRequestSchema = z
  .object({
    sido: regionCode,
    sigungu: regionCode.optional(),
    types: typesSchema,
    mood: moodSchema.optional(),
  })
  .strict();

export type CourseRequest = z.infer<typeof courseRequestSchema>;

export function parseCourseRequest(raw: unknown): CourseRequest {
  const parsed = courseRequestSchema.safeParse(raw);
  if (!parsed.success) throw new AppError("INVALID_INPUT", INVALID_INPUT_MESSAGE, INVALID_INPUT_STATUS);
  return parsed.data;
}
