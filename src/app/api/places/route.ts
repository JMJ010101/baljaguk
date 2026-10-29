import { z } from "zod";
import { AppError } from "@/lib/errors";
import { toErrorResponse } from "@/lib/errorResponse";
import { getPlaces } from "@/lib/tour/places";

const DEFAULT_NUM_OF_ROWS = 20;
const MAX_NUM_OF_ROWS = 50;
const DEFAULT_PAGE_NO = 1;
const INVALID_INPUT_MESSAGE = "요청 값이 올바르지 않아요. 다시 확인해 주세요.";
const INVALID_INPUT_STATUS = 400;

const querySchema = z.object({
  numOfRows: z.coerce.number().int().min(1).max(MAX_NUM_OF_ROWS).default(DEFAULT_NUM_OF_ROWS),
  pageNo: z.coerce.number().int().min(1).default(DEFAULT_PAGE_NO),
});

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const parsed = querySchema.safeParse({
      numOfRows: searchParams.get("numOfRows") ?? undefined,
      pageNo: searchParams.get("pageNo") ?? undefined,
    });
    if (!parsed.success) {
      throw new AppError("INVALID_INPUT", INVALID_INPUT_MESSAGE, INVALID_INPUT_STATUS);
    }
    return Response.json(await getPlaces(parsed.data));
  } catch (e) {
    return toErrorResponse(e);
  }
}
