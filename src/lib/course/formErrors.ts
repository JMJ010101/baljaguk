// 코스 만들기 폼의 값을 서버와 같은 스키마(courseRequestSchema)로 검증하고, 오류를 필드별 한국어 문구로 바꾼다.
// zod 기본 메시지는 영어라서 화면에 쓰지 않는다. 클라이언트에서도 쓸 수 있어서 server-only 파일을 import하지 않는다.
import { MOOD_MAX_LENGTH } from "@/lib/ai/constants";
import { MAX_SELECTED_TYPES } from "@/lib/course/constants";
import { courseRequestSchema, normalizeMood, type CourseRequest } from "@/lib/course/input";

// 폼이 들고 있는 값이다. 선택 안 한 시도·시군구는 빈 문자열이다.
export type CourseFormValues = {
  sido: string;
  sigungu: string;
  types: number[];
  mood: string;
};

export type CourseFormField = "sido" | "sigungu" | "types" | "mood";
export type CourseFormErrors = Partial<Record<CourseFormField, string>>;

export type CourseFormValidation = { ok: true; request: CourseRequest } | { ok: false; errors: CourseFormErrors };

const FIELDS: readonly CourseFormField[] = ["sido", "sigungu", "types", "mood"];

// 스키마에 넘길 값이다. 비어 있는 시군구와 분위기는 보내지 않는다. (스키마가 strict라서 모르는 키는 거절된다.)
export function buildCourseRequestInput(values: CourseFormValues): Record<string, unknown> {
  const input: Record<string, unknown> = { sido: values.sido, types: values.types };
  if (values.sigungu !== "") input.sigungu = values.sigungu;
  if (values.mood !== "") input.mood = values.mood;
  return input;
}

// 정리한 뒤의 분위기 길이다. 저장되는 길이와 같다.
export function moodLength(mood: string): number {
  return normalizeMood(mood).length;
}

export function validateCourseForm(values: CourseFormValues): CourseFormValidation {
  const parsed = courseRequestSchema.safeParse(buildCourseRequestInput(values));
  if (parsed.success) return { ok: true, request: parsed.data };

  const errors: CourseFormErrors = {};
  for (const issue of parsed.error.issues) {
    const field = FIELDS.find((name) => name === issue.path[0]);
    if (field === undefined || errors[field] !== undefined) continue;
    errors[field] = messageFor(field, issue.code, values);
  }
  // 알 수 없는 경로의 오류만 있으면 화면에 보여 줄 필드가 없어서 유형 칸에 일반 문구를 둔다.
  if (Object.keys(errors).length === 0) errors.types = "조건을 다시 확인해 주세요.";
  return { ok: false, errors };
}

function messageFor(field: CourseFormField, code: string, values: CourseFormValues): string {
  switch (field) {
    case "sido":
      return "지역을 선택해 주세요.";
    case "sigungu":
      return "시·군·구를 다시 선택해 주세요.";
    case "types":
      if (code === "too_small") return "장소 유형을 1개 이상 골라 주세요.";
      if (code === "too_big") return `장소 유형은 최대 ${MAX_SELECTED_TYPES}개까지 고를 수 있어요.`;
      return "장소 유형을 다시 골라 주세요.";
    case "mood": {
      const length = moodLength(values.mood);
      // 공백과 줄바꿈을 정리한 길이는 괜찮은데 정리하기 전 입력이 너무 긴 경우다.
      if (length <= MOOD_MAX_LENGTH) return "분위기가 너무 길어요. 공백과 줄바꿈을 줄여 주세요.";
      return `분위기는 ${MOOD_MAX_LENGTH}자 이하로 적어 주세요. (현재 ${length}자)`;
    }
  }
}
