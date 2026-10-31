// 코스 생성 요청의 오류 결과를 화면 종류로 바꾼다. 에러 코드 6개마다 화면 하나이고, 입력 오류(400)만 화면 없이 폼 상단 오류 박스로 보여 준다.
// 문구는 서버가 준 message를 쓰는 화면(호출 한도 초과, 조건 부족)에서만 받는다. 사용자 입력은 어디에도 담지 않는다.
// 클라이언트에서도 쓸 수 있어서 server-only 파일을 import하지 않는다.
import type { SubmitOutcome } from "@/lib/course/submit";

export type ErrorScreenKind =
  | "rate-limit"
  | "timeout"
  | "api-failed"
  | "course-failed"
  | "insufficient"
  | "db-unavailable";

export type ErrorView =
  | { kind: "screen"; screen: ErrorScreenKind; message?: string }
  | { kind: "form-error" };

// 후보가 모자란 경우의 status다. (lib/tour/candidates.ts의 insufficientError) 400은 입력 검증 실패다.
const HTTP_UNPROCESSABLE = 422;

type SubmitError = Extract<SubmitOutcome, { kind: "error" }>;

function serverMessage(outcome: SubmitError): string | undefined {
  return outcome.cause === "server" && outcome.message !== undefined && outcome.message !== "" ? outcome.message : undefined;
}

export function classifySubmitError(outcome: SubmitError): ErrorView {
  switch (outcome.code) {
    case "RATE_LIMIT":
      return { kind: "screen", screen: "rate-limit", message: serverMessage(outcome) };
    case "API_TIMEOUT":
      return { kind: "screen", screen: "timeout" };
    case "API_FAILED":
      return { kind: "screen", screen: "api-failed" };
    case "BAD_AI_RESPONSE":
      return { kind: "screen", screen: "course-failed" };
    case "DB_UNAVAILABLE":
      return { kind: "screen", screen: "db-unavailable" };
    case "INVALID_INPUT":
      if (outcome.status === HTTP_UNPROCESSABLE) {
        return { kind: "screen", screen: "insufficient", message: serverMessage(outcome) };
      }
      return { kind: "form-error" };
  }
}
