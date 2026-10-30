// 후보 중에서 장소를 고르게 하고(순서 있는 placeId 목록), 검증에 실패하면 위반 종류를 알려 한 번 다시 묻는다.
// 호출 -> 응답 모양 검사(client.ts) -> 내용 검증(parse.ts) -> 실패하면 재시도 1회 -> 그래도 실패하면 BAD_AI_RESPONSE.
// 타임아웃, 한도 초과, 서버 오류는 재시도하지 않고 바로 던진다.
import "server-only";
import { aiError, callCourseModel } from "@/lib/ai/client";
import { AI_RETRY_LIMIT, AI_TIMEOUT_MS } from "@/lib/ai/constants";
import { parseCoursePicks } from "@/lib/ai/parse";
import { promptV1 } from "@/lib/ai/prompts/v1";
import type { AiUsage, AiViolationKind, PromptVersion } from "@/lib/ai/types";
import { COURSE_MIN_COUNT } from "@/lib/course/constants";
import { getRequestedPickCount } from "@/lib/course/size";
import type { CourseCandidate } from "@/lib/course/types";
import { AppError } from "@/lib/errors";

const BAD_AI_RESPONSE_MESSAGE = "코스를 만들지 못했어요. 잠시 후 다시 시도해 주세요.";
const BAD_AI_RESPONSE_STATUS = 502;
const INVALID_INPUT_MESSAGE = "요청 값이 올바르지 않아요. 다시 확인해 주세요.";
const INVALID_INPUT_STATUS = 400;

export type PickCoursePlacesParams = {
  candidates: CourseCandidate[];
  regionName: string;
  selectedTypeIds: number[];
  // 후보에 실제로 있는 선택 유형(후보가 없는 유형은 뺀다)
  requiredTypeIds: number[];
  mood?: string;
  softHints: string[];
  prompt?: PromptVersion;
  // 요청 전체의 마감 시각(Date.now() 기준). 각 호출의 타임아웃을 남은 시간으로 제한하고, 남은 시간이 모자라면 재시도하지 않는다.
  deadlineAt?: number;
};

export type CoursePicksResult = {
  // 모델이 고른 순서 있는 목록. 요청한 장소 수(N+2 방식이면 N+2곳)와 같다.
  placeIds: number[];
  attempts: number;
  promptVersion: string;
  usage: AiUsage;
  durationMs: number;
};

export async function pickCoursePlaces(params: PickCoursePlacesParams): Promise<CoursePicksResult> {
  const { candidates, deadlineAt } = params;
  const prompt = params.prompt ?? promptV1;
  if (candidates.length < COURSE_MIN_COUNT) throw new AppError("INVALID_INPUT", INVALID_INPUT_MESSAGE, INVALID_INPUT_STATUS);
  const requestedCount = getRequestedPickCount(candidates.length);

  const total: AiUsage = { inputTokens: 0, outputTokens: 0, reasoningTokens: 0 };
  let totalMs = 0;
  let violations: AiViolationKind[] = [];

  for (let attempt = 1; attempt <= AI_RETRY_LIMIT + 1; attempt++) {
    const remainingMs = deadlineAt === undefined ? Infinity : deadlineAt - Date.now();
    if (remainingMs <= 0) throw aiError("API_TIMEOUT");

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
      violations,
    );
    const call = await callCourseModel({
      instructions,
      input,
      pickCount: requestedCount,
      timeoutMs: Math.min(AI_TIMEOUT_MS, remainingMs),
    });
    total.inputTokens += call.usage.inputTokens;
    total.outputTokens += call.usage.outputTokens;
    total.reasoningTokens += call.usage.reasoningTokens;
    totalMs += call.durationMs;

    if (call.ok) {
      const parsed = parseCoursePicks(call.text, { candidates, requestedCount, requiredTypeIds: params.requiredTypeIds });
      if (parsed.ok) {
        return { placeIds: parsed.placeIds, attempts: attempt, promptVersion: prompt.version, usage: total, durationMs: totalMs };
      }
      violations = parsed.violations;
    } else {
      violations = [call.violation];
    }

    // 사용자 입력과 모델 응답 내용은 남기지 않고 위반 종류만 남긴다.
    console.warn(`AI 응답 검증 실패: attempt=${attempt} violations=${violations.join(",")}`);

    const hasRetry = attempt <= AI_RETRY_LIMIT;
    const hasTime = deadlineAt === undefined || deadlineAt - Date.now() >= AI_TIMEOUT_MS;
    if (!hasRetry || !hasTime) break;
  }

  throw new AppError("BAD_AI_RESPONSE", BAD_AI_RESPONSE_MESSAGE, BAD_AI_RESPONSE_STATUS);
}
