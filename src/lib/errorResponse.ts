import { AppError } from "@/lib/errors";

const UNEXPECTED_MESSAGE = "문제가 생겼어요. 잠시 후 다시 시도해 주세요.";
const UNEXPECTED_STATUS = 500;

// AppError는 userMessage와 status만 응답에 담는다. 그 외 오류는 내용을 노출하지 않고 이름만 서버 로그에 남긴다.
export function toErrorResponse(e: unknown): Response {
  if (e instanceof AppError) {
    return Response.json({ error: { code: e.code, message: e.userMessage } }, { status: e.status });
  }
  console.error("예상하지 못한 오류:", e instanceof Error ? e.name : typeof e);
  return Response.json(
    { error: { code: "API_FAILED", message: UNEXPECTED_MESSAGE } },
    { status: UNEXPECTED_STATUS },
  );
}
