import { AppError } from "@/lib/errors";
import { toErrorResponse } from "@/lib/errorResponse";
import { parsePlaceId } from "@/lib/placeId";
import { enforcePlacesRateLimit } from "@/lib/rateLimit";
import { getPlaceDetail } from "@/lib/tour/placeDetail";

const INVALID_INPUT_MESSAGE = "요청 값이 올바르지 않아요. 다시 확인해 주세요.";
const INVALID_INPUT_STATUS = 400;

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const placeId = parsePlaceId((await params).id);
    if (placeId === undefined) {
      throw new AppError("INVALID_INPUT", INVALID_INPUT_MESSAGE, INVALID_INPUT_STATUS);
    }
    // 캐시에 없어서 관광공사를 부를 때만 한도를 센다. (캐시 적중은 세지 않는다)
    return Response.json(
      await getPlaceDetail(placeId, { beforeTourCalls: () => enforcePlacesRateLimit(request.headers) }),
    );
  } catch (e) {
    return toErrorResponse(e);
  }
}
