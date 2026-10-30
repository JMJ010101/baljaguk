import { AppError } from "@/lib/errors";

// 요청 하나의 전체 예산(마감 시각)을 단계들이 나눠 쓰게 하는 도우미다.
// 각 단계의 타임아웃은 "자기 상수와 남은 예산 중 작은 값"이다. 예산이 없으면 호출하지 않고 API_TIMEOUT이다.
const TIMEOUT_MESSAGE = "코스를 만드는 데 시간이 너무 오래 걸렸어요. 잠시 후 다시 시도해 주세요.";
const TIMEOUT_STATUS = 504;

// 마감 시각이 없으면 제한이 없다(Infinity). reserveMs는 뒤 단계를 위해 남겨 두는 시간이다.
export function remainingMs(deadlineAt: number | undefined, reserveMs = 0, now: number = Date.now()): number {
  return deadlineAt === undefined ? Infinity : deadlineAt - reserveMs - now;
}

export function stepTimeoutMs(ownMs: number, deadlineAt?: number, reserveMs = 0, now: number = Date.now()): number {
  const remaining = remainingMs(deadlineAt, reserveMs, now);
  if (remaining <= 0) throw new AppError("API_TIMEOUT", TIMEOUT_MESSAGE, TIMEOUT_STATUS);
  return Math.min(ownMs, remaining);
}
