"use client";

import { useEffect, useState } from "react";
import { fetchSigungu, type SigunguOutcome } from "@/lib/course/sigungu";
import type { Region } from "@/types";

type Failure = Extract<SigunguOutcome, { kind: "empty" | "rate-limit" | "error" }>;

export type SigunguState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ok"; regions: Region[] }
  | { status: "failed"; failure: Failure };

// 시도가 바뀔 때 시군구를 불러온다. 성공한 시도는 다시 부르지 않고 저장해 둔 목록을 쓴다.
// 다른 시도로 바뀌면 진행 중인 호출을 취소하고, 실패는 저장하지 않아서 reload를 눌러야 다시 부른다. (자동 재시도 없음)
export function useSigungu(sido: string): { state: SigunguState; reload: () => void } {
  const [loaded, setLoaded] = useState<Record<string, Region[]>>({});
  const [failure, setFailure] = useState<{ key: string; failure: Failure } | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  const key = `${sido}#${retryCount}`;
  const isLoaded = sido in loaded;

  useEffect(() => {
    if (sido === "" || isLoaded) return;
    const controller = new AbortController();
    fetchSigungu(sido, { signal: controller.signal }).then((outcome) => {
      if (outcome.kind === "aborted" || controller.signal.aborted) return;
      if (outcome.kind === "ok") setLoaded((prev) => ({ ...prev, [sido]: outcome.regions }));
      else setFailure({ key: `${sido}#${retryCount}`, failure: outcome });
    });
    return () => controller.abort();
  }, [sido, isLoaded, retryCount]);

  let state: SigunguState;
  if (sido === "") state = { status: "idle" };
  else if (isLoaded) state = { status: "ok", regions: loaded[sido] };
  else if (failure?.key === key) state = { status: "failed", failure: failure.failure };
  else state = { status: "loading" };

  return { state, reload: () => setRetryCount((count) => count + 1) };
}
