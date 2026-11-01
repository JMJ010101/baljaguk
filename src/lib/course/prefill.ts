// "다시 만들기" 미리 채우기다. 시도, 시군구, 유형만 쿼리(/course/new?sido=&sigungu=&types=12,39)로 전달한다.
// mood와 코스 id는 링크에도 파싱 결과에도 없다. 링크 함수의 인자에 mood가 없고, 파싱은 정해진 세 키만 읽는다.
// 쿼리는 서버 입력 스키마(courseRequestSchema)의 필드 스키마로 검증하고, 잘못된 값은 오류 없이 조용히 버린다.
// 클라이언트에서도 쓸 수 있어서 server-only 파일을 import하지 않는다.
import { courseRequestSchema } from "@/lib/course/input";

const NEW_COURSE_PATH = "/course/new";
const TYPE_SEPARATOR = ",";

// 쿼리에서 읽은 값이다. 값이 없거나 같은 키가 여러 번 오면(string[]) 없는 것으로 본다.
export type RecreatePrefill = { sido?: string; sigungu?: string; types?: number[] };
// 폼이 받는 초기값이다. 선택하지 않은 항목은 빈 문자열, 빈 배열이다.
export type FormPrefill = { sido: string; sigungu: string; types: number[] };

type QueryValue = string | string[] | undefined;

// 링크를 만든다. 코스에서 꺼낸 시도, 시군구, 유형만 받는다. (mood와 id는 받지 않는다)
export function buildRecreateHref(source: { sido: string; sigungu?: string; types: readonly number[] }): string {
  const parts = [`sido=${encodeURIComponent(source.sido)}`];
  if (source.sigungu !== undefined) parts.push(`sigungu=${encodeURIComponent(source.sigungu)}`);
  if (source.types.length > 0) parts.push(`types=${source.types.join(TYPE_SEPARATOR)}`);
  return `${NEW_COURSE_PATH}?${parts.join("&")}`;
}

function single(value: QueryValue): string | undefined {
  return typeof value === "string" ? value : undefined;
}

// 유형은 토큰 하나라도 잘못이면 필드 전체를 버린다. (일부만 믿지 않는다) 숫자는 "012" 같은 변형 없이 정식 표기만 받는다.
function parseTypes(raw: string): number[] | undefined {
  const numbers: number[] = [];
  for (const token of raw.split(TYPE_SEPARATOR)) {
    const value = Number(token);
    if (token === "" || !Number.isSafeInteger(value) || String(value) !== token) return undefined;
    numbers.push(value);
  }
  const parsed = courseRequestSchema.shape.types.safeParse(numbers);
  return parsed.success ? parsed.data : undefined;
}

export function parseRecreatePrefill(params: Record<string, QueryValue>): RecreatePrefill {
  const prefill: RecreatePrefill = {};

  const rawSido = single(params.sido);
  const sido = rawSido === undefined ? undefined : courseRequestSchema.shape.sido.safeParse(rawSido);
  // 시군구는 시도 안에서만 뜻이 있다. 시도가 잘못이면 시군구도 버린다.
  if (sido?.success) {
    prefill.sido = sido.data;
    const rawSigungu = single(params.sigungu);
    const sigungu = rawSigungu === undefined ? undefined : courseRequestSchema.shape.sigungu.safeParse(rawSigungu);
    if (sigungu?.success && sigungu.data !== undefined) prefill.sigungu = sigungu.data;
  }

  const rawTypes = single(params.types);
  if (rawTypes !== undefined) {
    const types = parseTypes(rawTypes);
    if (types !== undefined) prefill.types = types;
  }
  return prefill;
}

// 시도 목록과 맞춰 본다. 목록에 없거나 목록을 쓸 수 없으면(sidoCodes가 undefined) 시도와 시군구를 버리고 유형은 유지한다.
export function resolveFormPrefill(prefill: RecreatePrefill, sidoCodes: readonly string[] | undefined): FormPrefill {
  const sido = prefill.sido !== undefined && sidoCodes?.includes(prefill.sido) ? prefill.sido : "";
  return { sido, sigungu: sido === "" ? "" : (prefill.sigungu ?? ""), types: prefill.types ?? [] };
}
