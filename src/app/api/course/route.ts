import { COURSE_BUDGET_MS } from "@/lib/course/constants";
import { generateCourse } from "@/lib/course/generate";
import { AppError } from "@/lib/errors";
import { toErrorResponse } from "@/lib/errorResponse";

// Vercel 함수의 최대 실행 시간(초)이다. CLAUDE.md의 예외 규정에 따라 route 파일 상단에 리터럴로 쓴다.
// 코스 전체 예산(COURSE_BUDGET_MS, 80초)보다 크게 유지한다. 배포로 확인하기 전까지는 문서(Hobby와 Fluid Compute 기준 300초)를 근거로 한 가정이다.
export const maxDuration = 90;

const INVALID_INPUT_MESSAGE = "요청 값이 올바르지 않아요. 다시 확인해 주세요.";
const INVALID_INPUT_STATUS = 400;

// 임시 안전장치다. 호출 한도(rateLimit)가 들어가기 전까지 이 route는 환경변수 COURSE_API_ENABLED가 "true"일 때만 동작한다.
// 기본은 꺼짐이고 Vercel 환경변수에는 넣지 않는다. 로컬에서 확인할 때만 켠다. 단계 4에서 rateLimit을 넣을 때 이 안전장치를 제거한다.
const ENABLED_VALUE = "true";

export async function POST(request: Request) {
  if (process.env.COURSE_API_ENABLED !== ENABLED_VALUE) return new Response(null, { status: 404 });

  const deadlineAt = Date.now() + COURSE_BUDGET_MS;
  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      throw new AppError("INVALID_INPUT", INVALID_INPUT_MESSAGE, INVALID_INPUT_STATUS);
    }
    const { id, missingTypes } = await generateCourse(body, { deadlineAt });
    return Response.json({ id, missingTypes });
  } catch (e) {
    return toErrorResponse(e);
  }
}
