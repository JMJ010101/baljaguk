// DB 오류를 DB_UNAVAILABLE로 바꾸는 곳이다. lib/db의 모든 쿼리가 이 파일을 쓴다. (CLAUDE.md: lib/db는 Supabase 오류를 DB_UNAVAILABLE로 바꿔서 던진다)
import "server-only";
import { AppError } from "@/lib/errors";

export const DB_UNAVAILABLE_MESSAGE = "데이터를 불러오지 못했어요. 잠시 후 다시 시도해 주세요.";
export const DB_UNAVAILABLE_STATUS = 503;

// 내부 오류 내용은 사용자 메시지에 넣지 않는다. 서버 로그에는 대상과 오류 코드, 메시지만 남긴다.
export function dbUnavailableError(error: { code?: string; message?: string }, context: string): AppError {
  console.error(`${context} 오류: code=${error.code ?? "없음"} message=${error.message ?? "없음"}`);
  return new AppError("DB_UNAVAILABLE", DB_UNAVAILABLE_MESSAGE, DB_UNAVAILABLE_STATUS);
}

// 쿼리가 우리가 건 abortSignal 타임아웃으로 중단됐는지 판별한다. 타임아웃 판별은 이 함수 한 곳에서만 한다.
// supabase-js는 중단을 예외로 던지지 않고 { data: null, error: { message: "TimeoutError: ...", code: "" }, status: 0 }으로 돌려준다.
// (supabase-js 2.118, select와 upsert로 확인함) 두 조건을 모두 만족할 때만 타임아웃으로 본다.
// 중단된 쓰기는 서버에 반영됐는지 알 수 없다. 서버의 statement timeout 같은 DB 오류는 status가 0이 아니라서 여기에 해당하지 않는다.
export function isDbTimeoutError(result: { error: { message?: string } | null | undefined; status?: number }): boolean {
  const message = result.error?.message;
  return result.status === 0 && typeof message === "string" && message.startsWith("TimeoutError");
}
