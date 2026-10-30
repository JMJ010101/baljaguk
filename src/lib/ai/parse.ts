import { z } from "zod";
import type { AiViolationKind } from "@/lib/ai/types";

// 모델이 돌려준 본문(JSON 문자열)을 검증한다. 검증을 통과하지 못한 응답은 화면이나 DB에 쓰지 않는다. (CLAUDE.md)
// uniqueItems는 모델 API 스키마가 허용하지 않아서(측정으로 확인함) 중복은 여기서 검사한다.
const picksSchema = z.object({ placeIds: z.array(z.number().int().positive()) }).strict();

export type ParseContext = {
  candidates: ReadonlyArray<{ id: number; contentTypeId: number }>;
  // 요청한 장소 수와 정확히 같아야 한다.
  requestedCount: number;
  // 후보에 실제로 있는 선택 유형. 후보가 없는 유형은 넣지 않는다. (hard 조건 완화)
  requiredTypeIds: readonly number[];
};

export type ParseResult = { ok: true; placeIds: number[] } | { ok: false; violations: AiViolationKind[] };

// 이 검사는 모델이 고른 전체 목록(요청한 수, N+2 방식이면 N+2곳)을 대상으로 하는 1차 검사다.
// 선택 유형마다 최소 1곳이 "채택된 N곳"에 들어 있는지는 hard 검증(상세 확인) 뒤에 코스 조립에서 다시 검사한다.
// 상세 호출 전에 걸러서 호출을 아끼려고 여기서도 본다.
export function parseCoursePicks(text: string, context: ParseContext): ParseResult {
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    return { ok: false, violations: ["invalid_json"] };
  }
  const parsed = picksSchema.safeParse(json);
  if (!parsed.success) return { ok: false, violations: ["bad_output"] };

  const ids = parsed.data.placeIds;
  const typeById = new Map(context.candidates.map((c) => [c.id, c.contentTypeId]));
  const violations: AiViolationKind[] = [];

  if (ids.some((id) => !typeById.has(id))) violations.push("unknown_id");
  if (new Set(ids).size !== ids.length) violations.push("duplicate_id");
  if (ids.length !== context.requestedCount) violations.push("wrong_count");

  const pickedTypes = new Set(ids.map((id) => typeById.get(id)));
  if (context.requiredTypeIds.some((typeId) => !pickedTypes.has(typeId))) violations.push("missing_type");

  return violations.length === 0 ? { ok: true, placeIds: ids } : { ok: false, violations };
}
