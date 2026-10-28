export type ErrorCode =
  | "RATE_LIMIT"
  | "API_TIMEOUT"
  | "API_FAILED"
  | "BAD_AI_RESPONSE"
  | "INVALID_INPUT"
  | "DB_UNAVAILABLE";

export class AppError extends Error {
  constructor(
    public readonly code: ErrorCode,
    // 사용자에게 보여줄 문구. 내부 에러 내용은 담지 않는다.
    public readonly userMessage: string,
    public readonly status: number,
  ) {
    super(userMessage);
    this.name = "AppError";
  }
}
