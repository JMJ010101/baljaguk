// 호출 한도. 순서: IP 개수와 전체 개수를 동시에 센다 -> 둘 다 한도 미만이면 기록(insert) -> 요청 진행.
// 거절된 요청은 기록하지 않는다. (거절 요청이 전체 한도를 채우는 것을 막기 위해)
// 센 뒤에 기록하는 방식이라 동시에 들어온 요청은 한도를 그 동시 요청 수만큼 넘을 수 있다. (허용하는 오차)
// DB 오류나 타임아웃이면 통과시키지 않고 DB_UNAVAILABLE로 실패시킨다. (fail closed)
// 한도 값은 정책 인자로 받는다. 시험에서는 한도를 0으로 넘겨 상수를 바꾸지 않고 거절 경로를 확인한다.
import "server-only";
import { DB_TIMEOUT_MS } from "@/lib/db/client";
import { countUsage, recordUsage } from "@/lib/db/usage";
import { stepTimeoutMs } from "@/lib/deadline";
import { AppError } from "@/lib/errors";

const MINUTE_MS = 60 * 1000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;
const RATE_LIMIT_STATUS = 429;
const IP_LIMIT_MESSAGE = "요청이 너무 많아요. 잠시 후 다시 시도해 주세요.";
const GLOBAL_LIMIT_MESSAGE = "오늘 만들 수 있는 코스 수를 넘었어요. 내일 다시 시도해 주세요.";

export type LimitRule = { limit: number; windowMs: number };

// global을 빼면 IP별 한도만 적용한다.
export type RateLimitPolicy = { endpoint: string; perIp: LimitRule; global?: LimitRule };

export const COURSE_RATE_POLICY: RateLimitPolicy = {
  endpoint: "course",
  // 시간당 5회 (CLAUDE.md 제안값)
  perIp: { limit: 5, windowMs: HOUR_MS },
  // 임시값, 관광공사 한도 확인 전. 코스 1건이 관광공사를 최대 21번 부른다.
  global: { limit: 20, windowMs: DAY_MS },
};

export type RateLimitDeps = {
  countUsage: typeof countUsage;
  recordUsage: typeof recordUsage;
  now: () => number;
};

const defaultDeps: RateLimitDeps = { countUsage, recordUsage, now: Date.now };

export function rateLimitError(message: string): AppError {
  return new AppError("RATE_LIMIT", message, RATE_LIMIT_STATUS);
}

// 마감 시각(deadlineAt)이 있으면 남은 예산 안에서만 DB를 부른다. 단계별 DB 호출은 최대 DB_TIMEOUT_MS이고,
// 개수 조회 2개는 동시에 해서 최악의 경우 DB_TIMEOUT_MS * 2(조회 단계 + 기록 단계)를 쓴다.
export async function enforceRateLimit(
  params: { ipHash: string; policy: RateLimitPolicy; deadlineAt?: number },
  deps: RateLimitDeps = defaultDeps,
): Promise<void> {
  const { ipHash, policy, deadlineAt } = params;
  const now = deps.now();

  const countMs = stepTimeoutMs(DB_TIMEOUT_MS, deadlineAt);
  const [ipCount, globalCount] = await Promise.all([
    deps.countUsage({ endpoint: policy.endpoint, ipHash, sinceMs: now - policy.perIp.windowMs }, { timeoutMs: countMs }),
    policy.global === undefined
      ? Promise.resolve(undefined)
      : deps.countUsage({ endpoint: policy.endpoint, sinceMs: now - policy.global.windowMs }, { timeoutMs: countMs }),
  ]);

  if (ipCount >= policy.perIp.limit) throw rateLimitError(IP_LIMIT_MESSAGE);
  if (policy.global !== undefined && globalCount !== undefined && globalCount >= policy.global.limit) {
    throw rateLimitError(GLOBAL_LIMIT_MESSAGE);
  }

  const recordMs = stepTimeoutMs(DB_TIMEOUT_MS, deadlineAt);
  await deps.recordUsage({ endpoint: policy.endpoint, ipHash }, { timeoutMs: recordMs });
}
