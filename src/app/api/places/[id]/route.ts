import { z } from "zod";
import { AppError } from "@/lib/errors";
import { toErrorResponse } from "@/lib/errorResponse";
import { getPlaceDetail } from "@/lib/tour/placeDetail";

const INVALID_INPUT_MESSAGE = "요청 값이 올바르지 않아요. 다시 확인해 주세요.";
const INVALID_INPUT_STATUS = 400;

// 양의 정수만 허용한다. 숫자 상한은 Number.isSafeInteger까지만 본다.
const idSchema = z
  .string()
  .regex(/^\d+$/)
  .transform(Number)
  .refine((id) => id > 0 && Number.isSafeInteger(id));

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const parsed = idSchema.safeParse((await params).id);
    if (!parsed.success) {
      throw new AppError("INVALID_INPUT", INVALID_INPUT_MESSAGE, INVALID_INPUT_STATUS);
    }
    return Response.json(await getPlaceDetail(parsed.data));
  } catch (e) {
    return toErrorResponse(e);
  }
}
