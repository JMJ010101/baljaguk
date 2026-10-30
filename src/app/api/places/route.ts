import { z } from "zod";
import { AppError } from "@/lib/errors";
import { toErrorResponse } from "@/lib/errorResponse";
import { SIDO_CODE_PATTERN } from "@/lib/placesQuery";
import { CONTENT_TYPE_IDS } from "@/lib/tour/contentTypes";
import { getPlaces } from "@/lib/tour/places";

const DEFAULT_NUM_OF_ROWS = 20;
const MAX_NUM_OF_ROWS = 50;
const DEFAULT_PAGE_NO = 1;
// 코드표 값(CLAUDE.md, contentTypes.ts)과 매뉴얼의 arrange 값만 허용한다.
const ARRANGES = ["A", "C", "D", "O", "Q", "R"] as const;
const INVALID_INPUT_MESSAGE = "요청 값이 올바르지 않아요. 다시 확인해 주세요.";
const INVALID_INPUT_STATUS = 400;

const querySchema = z.object({
  numOfRows: z.coerce.number().int().min(1).max(MAX_NUM_OF_ROWS).default(DEFAULT_NUM_OF_ROWS),
  pageNo: z.coerce.number().int().min(1).default(DEFAULT_PAGE_NO),
  contentTypeId: z.coerce
    .number()
    .refine((id) => CONTENT_TYPE_IDS.includes(id))
    .optional(),
  arrange: z.enum(ARRANGES).optional(),
  // 앱 쪽 이름은 /api/regions와 같은 sido이고, 관광공사에는 lDongRegnCd로 보낸다.
  sido: z.string().regex(SIDO_CODE_PATTERN).optional(),
});

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const parsed = querySchema.safeParse({
      numOfRows: searchParams.get("numOfRows") ?? undefined,
      pageNo: searchParams.get("pageNo") ?? undefined,
      contentTypeId: searchParams.get("contentTypeId") ?? undefined,
      arrange: searchParams.get("arrange") ?? undefined,
      sido: searchParams.get("sido") ?? undefined,
    });
    if (!parsed.success) {
      throw new AppError("INVALID_INPUT", INVALID_INPUT_MESSAGE, INVALID_INPUT_STATUS);
    }
    const { sido, ...rest } = parsed.data;
    return Response.json(await getPlaces({ ...rest, lDongRegnCd: sido }));
  } catch (e) {
    return toErrorResponse(e);
  }
}
