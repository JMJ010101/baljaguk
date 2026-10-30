// 후보 중에서 장소를 고르게 하고(순서 있는 placeId 목록) 응답을 검증한다.
// requestCoursePicks: 한 번 호출해서 검증한다. 재시도는 호출하는 쪽이 소유한다. (코스 조립은 2차 검사와 재시도 한도를 공유한다)
// pickCoursePlaces: requestCoursePicks를 호출 -> 응답 모양 검사 -> 내용 검증 -> 실패하면 재시도 1회 -> 그래도 실패하면 BAD_AI_RESPONSE.
// 타임아웃, 한도 초과, 서버 오류는 재시도하지 않고 바로 던진다.
import "server-only";
import { callCourseModel } from "@/lib/ai/client";
import { AI_RETRY_LIMIT, AI_TIMEOUT_MS } from "@/lib/ai/constants";
import { parseCoursePicks } from "@/lib/ai/parse";
import { promptV1 } from "@/lib/ai/prompts/v1";
import type { AiUsage, AiViolationKind, PromptVersion } from "@/lib/ai/types";
import { COURSE_MIN_COUNT } from "@/lib/course/constants";
import { getRequestedPickCount } from "@/lib/course/size";
import type { CourseCandidate } from "@/lib/course/types";
import { remainingMs, stepTimeoutMs } from "@/lib/deadline";
import { AppError } from "@/lib/errors";

const BAD_AI_RESPONSE_MESSAGE = "코스를 만들지 못했어요. 잠시 후 다시 시도해 주세요.";
const BAD_AI_RESPONSE_STATUS = 502;
const INVALID_INPUT_MESSAGE = "요청 값이 올바르지 않아요. 다시 확인해 주세요.";
const INVALID_INPUT_STATUS = 400;

export function badAiResponseError(): AppError {
  return new AppError("BAD_AI_RESPONSE", BAD_AI_RESPONSE_MESSAGE, BAD_AI_RESPONSE_STATUS);
}

export type PickCoursePlacesParams = {
  candidates: CourseCandidate[];
  regionName: string;
  selectedTypeIds: number[];
  // 후보에 실제로 있는 선택 유형(후보가 없는 유형은 뺀다)
  requiredTypeIds: number[];
  mood?: string;
  softHints: string[];
  prompt?: PromptVersion;
  // 요청 전체의 마감 시각(Date.now() 기준). 각 호출의 타임아웃을 남은 시간으로 제한한다.
  deadlineAt?: number;
  // 마감 앞에서 뒤 단계를 위해 남겨 두는 시간
  reserveMs?: number;
};

export type PicksAttempt =
  | { ok: true; placeIds: number[]; usage: AiUsage; durationMs: number; promptVersion: string }
  | { ok: false; violations: AiViolationKind[]; usage: AiUsage; durationMs: number; promptVersion: string };

// 한 번 호출한다. violations가 있으면 이전 응답의 위반 종류를 모델에게 알린다.
export async function requestCoursePicks(
  params: PickCoursePlacesParams & { violations?: AiViolationKind[] },
): Promise<PicksAttempt> {
  const { candidates } = params;
  const prompt = params.prompt ?? promptV1;
  if (candidates.length < COURSE_MIN_COUNT) throw new AppError("INVALID_INPUT", INVALID_INPUT_MESSAGE, INVALID_INPUT_STATUS);
  const requestedCount = getRequestedPickCount(candidates.length);
  const timeoutMs = stepTimeoutMs(AI_TIMEOUT_MS, params.deadlineAt, params.reserveMs);

  const { instructions, input } = prompt.build(
    {
      regionName: params.regionName,
      selectedTypeIds: params.selectedTypeIds,
      mood: params.mood,
      softHints: params.softHints,
      requestedCount,
      minCount: COURSE_MIN_COUNT,
      candidates,
    },
    params.violations ?? [],
  );
  const call = await callCourseModel({ instructions, input, pickCount: requestedCount, timeoutMs });
  const common = { usage: call.usage, durationMs: call.durationMs, promptVersion: prompt.version };

  if (!call.ok) return { ok: false, violations: [call.violation], ...common };
  const parsed = parseCoursePicks(call.text, { candidates, requestedCount, requiredTypeIds: params.requiredTypeIds });
  if (parsed.ok) return { ok: true, placeIds: parsed.placeIds, ...common };
  return { ok: false, violations: parsed.violations, ...common };
}

export type CoursePicksResult = {
  // 모델이 고른 순서 있는 목록. 요청한 장소 수(N+2 방식이면 N+2곳)와 같다.
  placeIds: number[];
  attempts: number;
  promptVersion: string;
  usage: AiUsage;
  durationMs: number;
};

export async function pickCoursePlaces(params: PickCoursePlacesParams): Promise<CoursePicksResult> {
  const total: AiUsage = { inputTokens: 0, outputTokens: 0, reasoningTokens: 0 };
  let totalMs = 0;
  let violations: AiViolationKind[] = [];

  for (let attempt = 1; attempt <= AI_RETRY_LIMIT + 1; attempt++) {
    const result = await requestCoursePicks({ ...params, violations });
    total.inputTokens += result.usage.inputTokens;
    total.outputTokens += result.usage.outputTokens;
    total.reasoningTokens += result.usage.reasoningTokens;
    totalMs += result.durationMs;

    if (result.ok) {
      return { placeIds: result.placeIds, attempts: attempt, promptVersion: result.promptVersion, usage: total, durationMs: totalMs };
    }
    violations = result.violations;

    // 사용자 입력과 모델 응답 내용은 남기지 않고 위반 종류만 남긴다.
    console.warn(`AI 응답 검증 실패: attempt=${attempt} violations=${violations.join(",")}`);

    const hasRetry = attempt <= AI_RETRY_LIMIT;
    const hasTime = remainingMs(params.deadlineAt, params.reserveMs) >= AI_TIMEOUT_MS;
    if (!hasRetry || !hasTime) break;
  }

  throw badAiResponseError();
}
