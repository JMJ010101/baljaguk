import { z } from "zod";
import { AppError } from "@/lib/errors";
import { toErrorResponse } from "@/lib/errorResponse";
import { SIDO_CODE_PATTERN } from "@/lib/placesQuery";
import { enforcePlacesRateLimit } from "@/lib/rateLimit";
import {
  getSidoList,
  getSigunguList,
  INVALID_INPUT_MESSAGE,
  INVALID_INPUT_STATUS,
} from "@/lib/tour/regions";

// sido가 없으면 시도 목록이고, 있으면 1~5자리 숫자 문자열이어야 한다. 빈 값도 오류다.
const querySchema = z.object({
  sido: z.string().regex(SIDO_CODE_PATTERN).optional(),
});

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const parsed = querySchema.safeParse({ sido: searchParams.get("sido") ?? undefined });
    if (!parsed.success) {
      throw new AppError("INVALID_INPUT", INVALID_INPUT_MESSAGE, INVALID_INPUT_STATUS);
    }
    const { sido } = parsed.data;
    // 메모리 캐시에 없어서 관광공사를 부를 때만 한도를 센다.
    const options = { beforeTourCall: () => enforcePlacesRateLimit(request.headers) };
    return Response.json(sido === undefined ? await getSidoList(options) : await getSigunguList(sido, options));
  } catch (e) {
    return toErrorResponse(e);
  }
}
