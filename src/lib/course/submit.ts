// 코스 만들기 화면이 /api/course를 부르고, 결과를 화면이 다룰 수 있는 모양으로 분류한다.
// 서버가 JSON이 아닌 응답(플랫폼의 504 등)이나 네트워크 오류를 줄 수 있어서 모든 경우를 에러 코드 6개 중 하나로 바꾼다.
// 클라이언트에서 쓴다. server-only 파일을 import하지 않는다.
import { z } from "zod";
import { COURSE_CLIENT_WAIT_MS } from "@/lib/course/constants";
import type { CourseRequest } from "@/lib/course/input";
import type { ErrorCode } from "@/lib/errors";

const COURSE_API_URL = "/api/course";
const HTTP_GATEWAY_TIMEOUT = 504;
const ERROR_CODES = [
  "RATE_LIMIT",
  "API_TIMEOUT",
  "API_FAILED",
  "BAD_AI_RESPONSE",
  "INVALID_INPUT",
  "DB_UNAVAILABLE",
] as const satisfies readonly ErrorCode[];

// 화면은 cause로 문구를 조금 다르게 쓴다. (네트워크 끊김, 클라이언트 대기 초과 등) 에러 코드는 6개 그대로다.
export type SubmitErrorCause = "server" | "network" | "client-timeout" | "bad-response";

export type SubmitOutcome =
  | { kind: "ok"; id: string }
  | { kind: "error"; code: ErrorCode; cause: SubmitErrorCause; status?: number; message?: string }
  // 화면이 사라지는 등 호출하는 쪽이 취소했다. 화면에는 아무것도 보여 주지 않는다.
  | { kind: "aborted" };

const successSchema = z.object({ id: z.uuid() });
const errorSchema = z.object({
  error: z.object({ code: z.enum(ERROR_CODES), message: z.string().optional() }),
});

export type SubmitOptions = {
  signal?: AbortSignal;
  waitMs?: number;
  // 테스트에서 가짜 fetch를 넣는다.
  fetchImpl?: typeof fetch;
};

export async function postCourse(request: CourseRequest, options: SubmitOptions = {}): Promise<SubmitOutcome> {
  const { signal, waitMs = COURSE_CLIENT_WAIT_MS, fetchImpl = fetch } = options;
  if (signal?.aborted) return { kind: "aborted" };

  // AbortSignal.any는 오래된 브라우저에 없어서 쓰지 않고, 컨트롤러 하나에 두 원인을 모은다.
  const controller = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, waitMs);
  const onExternalAbort = () => controller.abort();
  signal?.addEventListener("abort", onExternalAbort);

  try {
    const res = await fetchImpl(COURSE_API_URL, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(request),
      signal: controller.signal,
    });

    let json: unknown;
    try {
      json = await res.json();
    } catch {
      if (controller.signal.aborted) throw new DOMException("aborted", "AbortError");
      // JSON이 아닌 응답이다. 플랫폼의 시간 초과(504)는 API_TIMEOUT으로, 그 밖은 API_FAILED로 본다.
      const code: ErrorCode = res.status === HTTP_GATEWAY_TIMEOUT ? "API_TIMEOUT" : "API_FAILED";
      return { kind: "error", code, cause: "bad-response", status: res.status };
    }

    if (res.ok) {
      const parsed = successSchema.safeParse(json);
      if (parsed.success) return { kind: "ok", id: parsed.data.id };
      return { kind: "error", code: "API_FAILED", cause: "bad-response", status: res.status };
    }

    const parsedError = errorSchema.safeParse(json);
    if (parsedError.success) {
      const { code, message } = parsedError.data.error;
      return { kind: "error", code, cause: "server", status: res.status, message };
    }
    const code: ErrorCode = res.status === HTTP_GATEWAY_TIMEOUT ? "API_TIMEOUT" : "API_FAILED";
    return { kind: "error", code, cause: "bad-response", status: res.status };
  } catch {
    if (timedOut) return { kind: "error", code: "API_TIMEOUT", cause: "client-timeout" };
    if (signal?.aborted) return { kind: "aborted" };
    return { kind: "error", code: "API_FAILED", cause: "network" };
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", onExternalAbort);
  }
}
