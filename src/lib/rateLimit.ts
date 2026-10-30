// 호출 한도. 순서: IP 개수와 전체 개수를 동시에 센다 -> 둘 다 한도 미만이면 기록(insert) -> 요청 진행.
// 거절된 요청은 기록하지 않는다. (거절 요청이 전체 한도를 채우는 것을 막기 위해)
// 센 뒤에 기록하는 방식이라 동시에 들어온 요청은 한도를 그 동시 요청 수만큼 넘을 수 있다. (허용하는 오차)
// DB 오류나 타임아웃이면 통과시키지 않고 DB_UNAVAILABLE로 실패시킨다. (fail closed)
// 한도 값은 정책 인자로 받는다. 시험에서는 한도를 0으로 넘겨 상수를 바꾸지 않고 거절 경로를 확인한다.
import "server-only";
import { getClientIpHash } from "@/lib/clientIp";
import { DB_TIMEOUT_MS } from "@/lib/db/client";
import { countUsage, recordUsage } from "@/lib/db/usage";
import { stepTimeoutMs } from "@/lib/deadline";
import { AppError } from "@/lib/errors";

const MINUTE_MS = 60 * 1000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;
const RATE_LIMIT_STATUS = 429;

export type LimitRule = { limit: number; windowMs: number };

// global을 빼면 IP별 한도만 적용한다. messages는 한도를 넘었을 때 화면에 보여 줄 문구다.
// 문구에는 한도 수치를 넣지 않는다. 하루 한도는 달력 날짜가 아니라 최근 24시간 창이라 "내일"처럼 시점을 특정하지 않는다.
export type RateLimitPolicy = {
  endpoint: string;
  perIp: LimitRule;
  global?: LimitRule;
  messages: { perIp: string; global: string };
};

// 전체 하루 한도의 단위는 "관광공사를 실제로 부르는 API 요청 수"다. usage_log 한 행이 요청 1건이다.
// 관광공사 한도: 포털에서 기능별로 일일 트래픽 1000이 표시됨, 기능별인지 합산인지 확인 필요.
// 합산 가정으로 보수적 값, 배포 후 사용량을 보고 조정. (코스 하루 20건 x 최대 21번 + 장소 하루 150요청 x 최대 3번 = 최대 870번)
export const COURSE_RATE_POLICY: RateLimitPolicy = {
  endpoint: "course",
  // 시간당 5회 (CLAUDE.md 제안값)
  perIp: { limit: 5, windowMs: HOUR_MS },
  // 임시값. 코스 1건이 관광공사를 최대 21번 부른다. 위 주석의 한도 확인 필요 사항이 적용된다.
  global: { limit: 20, windowMs: DAY_MS },
  messages: {
    perIp: "코스 만들기 요청이 많아요. 잠시 후 다시 시도해 주세요.",
    global: "오늘 만들 수 있는 코스 수를 넘었어요. 시간이 조금 지난 뒤 다시 시도해 주세요.",
  },
};

// 장소 API(목록, 지역, 상세)가 한 통을 같이 쓴다. 관광공사를 실제로 부를 때만 센다.
// 한 요청이 관광공사를 부르는 횟수: 목록 1, 지역 1, 상세 3(캐시 미스). 하루 150요청이면 최대 450번이다.
export const PLACES_RATE_POLICY: RateLimitPolicy = {
  endpoint: "places",
  // 분당 30회 (CLAUDE.md 제안값)
  perIp: { limit: 30, windowMs: MINUTE_MS },
  // 임시값. 관광공사 한도: 포털에서 기능별로 일일 트래픽 1000이 표시됨, 기능별인지 합산인지 확인 필요.
  // 합산 가정으로 보수적 값, 배포 후 사용량을 보고 조정.
  global: { limit: 150, windowMs: DAY_MS },
  messages: {
    perIp: "장소 조회 요청이 많아요. 잠시 후 다시 시도해 주세요.",
    global: "오늘 장소 조회 가능 횟수를 넘었어요. 시간이 조금 지난 뒤 다시 시도해 주세요.",
  },
};

// 장소 API가 쓰는 한 줄짜리 확인이다. IP 해시는 호출될 때 만든다(소금 설정 오류는 검증을 통과한 요청에서만 난다).
export function enforcePlacesRateLimit(headers: Headers): Promise<void> {
  return enforceRateLimit({ ipHash: getClientIpHash(headers), policy: PLACES_RATE_POLICY });
}

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

  if (ipCount >= policy.perIp.limit) throw rateLimitError(policy.messages.perIp);
  if (policy.global !== undefined && globalCount !== undefined && globalCount >= policy.global.limit) {
    throw rateLimitError(policy.messages.global);
  }

  const recordMs = stepTimeoutMs(DB_TIMEOUT_MS, deadlineAt);
  await deps.recordUsage({ endpoint: policy.endpoint, ipHash }, { timeoutMs: recordMs });
}
