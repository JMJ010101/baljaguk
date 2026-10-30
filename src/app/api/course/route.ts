import { COURSE_BUDGET_MS } from "@/lib/course/constants";
import { getClientIpHash } from "@/lib/clientIp";
import { generateCourse } from "@/lib/course/generate";
import { AppError } from "@/lib/errors";
import { toErrorResponse } from "@/lib/errorResponse";
import { COURSE_RATE_POLICY, enforceRateLimit } from "@/lib/rateLimit";

// Vercel 함수의 최대 실행 시간(초)이다. CLAUDE.md의 예외 규정에 따라 route 파일 상단에 리터럴로 쓴다.
// 코스 전체 예산(COURSE_BUDGET_MS, 80초)보다 크게 유지한다. 배포로 확인하기 전까지는 문서(Hobby와 Fluid Compute 기준 300초)를 근거로 한 가정이다.
export const maxDuration = 90;

const INVALID_INPUT_MESSAGE = "요청 값이 올바르지 않아요. 다시 확인해 주세요.";
const INVALID_INPUT_STATUS = 400;

export async function POST(request: Request) {
  const deadlineAt = Date.now() + COURSE_BUDGET_MS;
  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      throw new AppError("INVALID_INPUT", INVALID_INPUT_MESSAGE, INVALID_INPUT_STATUS);
    }
    // 호출 한도는 입력 검증 뒤, 외부 호출 전에 한 번 확인한다. 검증에 실패한 요청은 세지 않는다.
    const { id, missingTypes } = await generateCourse(body, {
      deadlineAt,
      beforeExternalCalls: () =>
        enforceRateLimit({ ipHash: getClientIpHash(request), policy: COURSE_RATE_POLICY, deadlineAt }),
    });
    return Response.json({ id, missingTypes });
  } catch (e) {
    return toErrorResponse(e);
  }
}
