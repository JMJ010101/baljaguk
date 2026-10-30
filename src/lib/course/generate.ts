// 코스 하나를 만드는 흐름이다. 입력 검증 -> 후보 수집 -> AI가 순서 있는 placeId 고르기(1차 검증)
// -> 상세 확인으로 hard 검사와 채택(2차 검사) -> 저장. 모든 외부 호출은 전체 예산(deadlineAt) 안에서만 한다.
// AI 재시도 한도(총 2번)는 1차 검증과 2차 검사가 공유한다. 한도를 이미 썼거나 시간이 모자라면 재호출하지 않고 실패한다.
import "server-only";
import { randomUUID } from "node:crypto";
import { AI_RETRY_LIMIT, AI_TIMEOUT_MS } from "@/lib/ai/constants";
import { badAiResponseError, requestCoursePicks } from "@/lib/ai/picks";
import type { AiUsage, AiViolationKind } from "@/lib/ai/types";
import { verifyAndAdopt, type VerifyPick } from "@/lib/course/assemble";
import {
  COURSE_MAX_COUNT,
  COURSE_MIN_COUNT,
  COURSE_SAVE_RESERVE_MS,
  COURSE_VERIFY_ROUND_MS,
  MIN_POOL,
} from "@/lib/course/constants";
import { parseCourseRequest } from "@/lib/course/input";
import type { MissingType } from "@/lib/course/types";
import { createCourse, type CourseInputSnapshot } from "@/lib/db/courses";
import { deadlineExceededError, remainingMs } from "@/lib/deadline";
import { AppError } from "@/lib/errors";
import { getPersona } from "@/lib/personas";
import { collectCandidates, insufficientError } from "@/lib/tour/candidates";
import { getPlaceDetail } from "@/lib/tour/placeDetail";

// 테스트에서 외부 호출을 바꿔 끼울 수 있게 한다.
export type GenerateDeps = {
  collectCandidates: typeof collectCandidates;
  requestCoursePicks: typeof requestCoursePicks;
  getPlaceDetail: typeof getPlaceDetail;
  createCourse: typeof createCourse;
  newId: () => string;
};

const defaultDeps: GenerateDeps = { collectCandidates, requestCoursePicks, getPlaceDetail, createCourse, newId: randomUUID };

export type GenerateMeta = {
  attempts: number;
  promptVersion: string;
  usage: AiUsage;
  candidateCount: number;
  radiusMeters: number;
  anchorPlaceId: number;
  // 상세 확인한 서로 다른 장소 수와 그중 hard 불통과 장소 수
  verifiedPlaceCount: number;
  hardExcludedPlaceCount: number;
  verifyRounds: number;
  timingsMs: { candidates: number; ai: number; verify: number; save: number; total: number };
};

export type GenerateResult = {
  id: string;
  placeIds: number[];
  missingTypes: MissingType[];
  meta: GenerateMeta;
};

// 기준점 주소의 앞부분에서 지역 이름을 뽑는다. (시도만 고르면 첫 토큰, 시군구까지 고르면 앞 두 토큰) 주소가 없으면 지역 코드로 대신한다.
export function deriveRegionName(address: string | undefined, sido: string, sigungu?: string): string {
  const tokens = address?.trim().split(/\s+/).filter(Boolean) ?? [];
  if (tokens.length === 0) return sigungu === undefined ? `지역 코드 ${sido}` : `지역 코드 ${sido}-${sigungu}`;
  return sigungu === undefined ? tokens[0] : tokens.slice(0, 2).join(" ");
}

export async function generateCourse(
  rawRequest: unknown,
  options: {
    deadlineAt: number;
    deps?: Partial<GenerateDeps>;
    // 입력 검증 뒤, 외부 호출(관광공사, OpenAI) 전에 한 번만 부른다. 호출 한도 확인(rateLimit)을 여기에 연결한다.
    // 던지면 외부 호출 없이 그 오류로 끝난다. 재시도 루프 안에서는 다시 부르지 않는다.
    beforeExternalCalls?: () => Promise<void>;
  },
): Promise<GenerateResult> {
  const deps: GenerateDeps = { ...defaultDeps, ...options.deps };
  const { deadlineAt } = options;
  const startedAt = Date.now();

  // 입력 검증에 실패하면 여기서 끝난다. 외부 호출은 0번이다.
  const request = parseCourseRequest(rawRequest);
  const persona = getPersona();

  await options.beforeExternalCalls?.();

  const collectStartedAt = Date.now();
  const pool = await deps.collectCandidates({
    sido: request.sido,
    sigungu: request.sigungu,
    types: request.types,
    deadlineAt,
    reserveMs: COURSE_SAVE_RESERVE_MS,
  });
  const candidatesMs = Date.now() - collectStartedAt;

  const allowed = pool.candidates.filter((candidate) => persona.hardFilters.every((filter) => filter(candidate)));
  if (allowed.length < MIN_POOL) throw insufficientError();
  const typeById = new Map(allowed.map((candidate) => [candidate.id, candidate.contentTypeId]));
  const regionName = deriveRegionName(pool.anchor.address, request.sido, request.sigungu);
  const requiredFor = (shown: typeof allowed) => request.types.filter((typeId) => shown.some((c) => c.contentTypeId === typeId));

  const verify: VerifyPick = async (placeId) => {
    try {
      const { detail } = await deps.getPlaceDetail(placeId, { deadlineAt, reserveMs: COURSE_SAVE_RESERVE_MS });
      return detail.acmpyTypeCd !== undefined ? "pass" : "fail";
    } catch (e) {
      // 장소가 사라졌으면(404) hard 불통과로 본다. 그 밖의 오류는 통과 여부를 알 수 없어 그대로 던진다.
      if (e instanceof AppError && e.code === "INVALID_INPUT") return "fail";
      throw e;
    }
  };

  // 재시도는 총 AI_RETRY_LIMIT + 1번의 호출 안에서만 하고, 남은 시간이 AI 호출 + 상세 확인 한 라운드보다 많을 때만 한다.
  let attempts = 0;
  const canRetry = () =>
    attempts < AI_RETRY_LIMIT + 1 && remainingMs(deadlineAt, COURSE_SAVE_RESERVE_MS) >= AI_TIMEOUT_MS + COURSE_VERIFY_ROUND_MS;
  const canRunRound = () => remainingMs(deadlineAt, COURSE_SAVE_RESERVE_MS) >= COURSE_VERIFY_ROUND_MS;

  let shown = allowed; // AI에게 보여 주는 후보. 2차 검사에서 hard 불통과로 확인된 장소는 재호출 때 뺀다.
  let violations: AiViolationKind[] = [];
  const usage: AiUsage = { inputTokens: 0, outputTokens: 0, reasoningTokens: 0 };
  let promptVersion = "";
  let aiMs = 0;
  let verifyMs = 0;
  let verifyRounds = 0;
  const verifiedIds = new Set<number>();
  const hardExcludedIds = new Set<number>();
  let adopted: number[] | undefined;

  while (adopted === undefined) {
    attempts++;
    const attempt = await deps.requestCoursePicks({
      candidates: shown,
      regionName,
      selectedTypeIds: request.types,
      requiredTypeIds: requiredFor(shown),
      mood: request.mood,
      softHints: persona.softHints,
      deadlineAt,
      reserveMs: COURSE_SAVE_RESERVE_MS,
      violations,
    });
    usage.inputTokens += attempt.usage.inputTokens;
    usage.outputTokens += attempt.usage.outputTokens;
    usage.reasoningTokens += attempt.usage.reasoningTokens;
    aiMs += attempt.durationMs;
    promptVersion = attempt.promptVersion;

    // 1차 검증 실패: 응답이 규칙을 어김
    if (!attempt.ok) {
      console.warn(`코스 AI 1차 검증 실패: attempt=${attempts} violations=${attempt.violations.join(",")}`);
      if (!canRetry()) throw badAiResponseError();
      violations = attempt.violations;
      continue;
    }

    // 2차 검사: 상세 확인(hard)을 통과한 장소로 채택
    const verifyStartedAt = Date.now();
    const result = await verifyAndAdopt({
      picks: attempt.placeIds,
      typeOf: (placeId) => typeById.get(placeId),
      requiredTypeIds: requiredFor(shown),
      targetCount: Math.min(COURSE_MAX_COUNT, attempt.placeIds.length),
      minCount: COURSE_MIN_COUNT,
      verify,
      canRunRound,
    });
    verifyMs += Date.now() - verifyStartedAt;
    verifyRounds += result.stats.rounds;
    result.stats.verifiedIds.forEach((placeId) => verifiedIds.add(placeId));
    result.stats.failedIds.forEach((placeId) => hardExcludedIds.add(placeId));

    if (result.ok) {
      adopted = result.placeIds;
      break;
    }
    if (result.reason === "budget") throw deadlineExceededError();

    // 2차 검사 실패는 데이터 때문이다(AI 응답은 규칙대로였다). 한도가 남았으면 hard 불통과 장소를 빼고 한 번 더 묻는다.
    console.warn(`코스 2차 검사 실패: attempt=${attempts} reason=${result.reason} excluded=${hardExcludedIds.size}`);
    if (!canRetry()) throw insufficientError();
    shown = shown.filter((candidate) => !hardExcludedIds.has(candidate.id));
    if (shown.length < MIN_POOL) throw insufficientError();
    violations = result.reason === "type_uncovered" ? ["missing_type"] : [];
  }

  // 저장. id는 서버에서 만들고 한 번만 쓴다.
  const input: CourseInputSnapshot = {
    sido: request.sido,
    ...(request.sigungu === undefined ? {} : { sigungu: request.sigungu }),
    types: request.types,
    ...(request.mood === undefined ? {} : { mood: request.mood }),
    persona: { id: persona.id, profile: persona.profile },
    anchorPlaceId: pool.anchor.id,
    radiusMeters: pool.radiusMeters,
    missingTypes: pool.missingTypes,
  };
  const id = deps.newId();
  const saveStartedAt = Date.now();
  await deps.createCourse({ id, input, placeIds: adopted, promptVersion }, { deadlineAt });
  const saveMs = Date.now() - saveStartedAt;

  return {
    id,
    placeIds: adopted,
    missingTypes: pool.missingTypes,
    meta: {
      attempts,
      promptVersion,
      usage,
      candidateCount: allowed.length,
      radiusMeters: pool.radiusMeters,
      anchorPlaceId: pool.anchor.id,
      verifiedPlaceCount: verifiedIds.size,
      hardExcludedPlaceCount: hardExcludedIds.size,
      verifyRounds,
      timingsMs: { candidates: candidatesMs, ai: aiMs, verify: verifyMs, save: saveMs, total: Date.now() - startedAt },
    },
  };
}
