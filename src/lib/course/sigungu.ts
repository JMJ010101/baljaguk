// 코스 만들기 폼이 /api/regions?sido=를 불러 시군구 목록을 받고, 결과를 화면이 다룰 수 있는 모양으로 분류한다.
// 시군구는 선택 항목이라 실패해도 폼은 막히지 않는다. 실패 문구는 이 파일에서 정한다. 새 오류 화면은 만들지 않는다.
// 클라이언트에서 쓴다. server-only 파일을 import하지 않는다.
import { z } from "zod";
import type { Region } from "@/types";

const REGIONS_API_URL = "/api/regions";
const HTTP_NOT_FOUND = 404;
const FALLBACK_RATE_LIMIT_MESSAGE = "잠시 후 다시 시도해 주세요.";

export type SigunguOutcome =
  | { kind: "ok"; regions: Region[] }
  // 시군구가 없는 시도다. (서버는 빈 결과를 INVALID_INPUT 404로 준다.)
  | { kind: "empty" }
  | { kind: "rate-limit"; message?: string }
  | { kind: "error" }
  | { kind: "aborted" };

const okSchema = z.object({
  regions: z.array(z.object({ code: z.string().min(1), name: z.string().min(1) })),
});
const errorSchema = z.object({
  error: z.object({ code: z.string(), message: z.string().optional() }),
});

export type FetchSigunguOptions = {
  signal?: AbortSignal;
  // 테스트에서 가짜 fetch를 넣는다.
  fetchImpl?: typeof fetch;
};

export async function fetchSigungu(sido: string, options: FetchSigunguOptions = {}): Promise<SigunguOutcome> {
  const { signal, fetchImpl = fetch } = options;
  if (signal?.aborted) return { kind: "aborted" };
  try {
    const res = await fetchImpl(`${REGIONS_API_URL}?sido=${encodeURIComponent(sido)}`, { signal });
    let json: unknown;
    try {
      json = await res.json();
    } catch {
      return signal?.aborted ? { kind: "aborted" } : { kind: "error" };
    }

    if (res.ok) {
      const parsed = okSchema.safeParse(json);
      if (!parsed.success) return { kind: "error" };
      return parsed.data.regions.length > 0 ? { kind: "ok", regions: parsed.data.regions } : { kind: "empty" };
    }

    const parsedError = errorSchema.safeParse(json);
    if (!parsedError.success) return { kind: "error" };
    const { code, message } = parsedError.data.error;
    if (code === "RATE_LIMIT") return { kind: "rate-limit", message };
    if (code === "INVALID_INPUT" && res.status === HTTP_NOT_FOUND) return { kind: "empty" };
    return { kind: "error" };
  } catch {
    return signal?.aborted ? { kind: "aborted" } : { kind: "error" };
  }
}

// 시군구를 못 받았을 때 시군구 칸 아래에 보여 주는 안내다. 어느 경우든 시군구를 고르지 않고 코스를 만들 수 있다.
export function sigunguNotice(outcome: Extract<SigunguOutcome, { kind: "empty" | "rate-limit" | "error" }>): string {
  switch (outcome.kind) {
    case "empty":
      return "이 지역은 시·군·구를 나눠 고를 수 없어요. 지역 전체로 코스를 만들어요.";
    case "rate-limit":
      return `${outcome.message ?? FALLBACK_RATE_LIMIT_MESSAGE} 시·군·구를 고르지 않고 코스를 만들 수도 있어요.`;
    case "error":
      return "시·군·구 목록을 불러오지 못했어요. 고르지 않고 지역 전체로 코스를 만들 수 있어요.";
  }
}
