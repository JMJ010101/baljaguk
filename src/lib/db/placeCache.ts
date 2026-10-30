// place_cache 읽기/쓰기. data에는 { place, detail }을 저장하고, 읽을 때 zod로 다시 검증한다.
// DB의 place_id는 text, Place의 id는 number다. 변환은 이 파일 안에서만 한다.
import "server-only";
import { z } from "zod";
import { createDbClient, DB_TIMEOUT_MS } from "@/lib/db/client";
import { AppError } from "@/lib/errors";
import type { Place, PlaceDetail } from "@/types";

const TABLE_NAME = "place_cache";
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const DB_UNAVAILABLE_MESSAGE = "데이터를 불러오지 못했어요. 잠시 후 다시 시도해 주세요.";
const DB_UNAVAILABLE_STATUS = 503;

const placeSchema = z.object({
  id: z.number(),
  contentTypeId: z.number(),
  title: z.string(),
  address: z.string().optional(),
  longitude: z.number().optional(),
  latitude: z.number().optional(),
  imageUrl: z.string().optional(),
  imageCopyright: z.string().optional(),
  modifiedTime: z.string().optional(),
  sidoCode: z.string().optional(),
  sigunguCode: z.string().optional(),
}) satisfies z.ZodType<Place>;

const placeDetailSchema = z.object({
  placeId: z.number(),
  acmpyTypeCd: z.string().optional(),
  acmpyPsblCpam: z.string().optional(),
  acmpyNeedMtr: z.string().optional(),
  etcAcmpyInfo: z.string().optional(),
  relaAcdntRiskMtr: z.string().optional(),
  hours: z.string().optional(),
  rest: z.string().optional(),
}) satisfies z.ZodType<PlaceDetail>;

// 기존 캐시 행이 스키마 변경 뒤에도 통과하는지 임시 스크립트로 확인할 수 있게 내보낸다.
export const cachedPlaceSchema = z.object({
  place: placeSchema,
  detail: placeDetailSchema,
});

export type CachedPlace = z.infer<typeof cachedPlaceSchema>;

// 내부 오류 내용은 사용자 메시지에 넣지 않는다. 서버 로그에는 오류 코드와 메시지만 남긴다.
function dbUnavailableError(error: { code?: string; message?: string }): AppError {
  console.error(`place_cache 오류: code=${error.code ?? "없음"} message=${error.message ?? "없음"}`);
  return new AppError("DB_UNAVAILABLE", DB_UNAVAILABLE_MESSAGE, DB_UNAVAILABLE_STATUS);
}

// 행이 없거나, 만료됐거나, 검증에 실패하면 null(캐시 없음)이다.
export async function getCachedPlace(placeId: number): Promise<CachedPlace | null> {
  const rowId = String(placeId);
  const { data: row, error } = await createDbClient()
    .from(TABLE_NAME)
    .select("place_id, data, expires_at")
    .eq("place_id", rowId)
    .abortSignal(AbortSignal.timeout(DB_TIMEOUT_MS))
    .maybeSingle();
  if (error) throw dbUnavailableError(error);
  if (!row) return null;

  const expiresAt = new Date(row.expires_at).getTime();
  if (Number.isNaN(expiresAt) || expiresAt <= Date.now()) return null;

  // 원본 내용은 로그에 남기지 않는다.
  const parsed = cachedPlaceSchema.safeParse(row.data);
  const consistent =
    parsed.success &&
    parsed.data.place.id === parsed.data.detail.placeId &&
    String(parsed.data.place.id) === row.place_id;
  if (!parsed.success || !consistent) {
    console.warn(`place_cache 검증 실패로 캐시 없음 처리: place_id=${rowId}`);
    return null;
  }
  return parsed.data;
}

// 같은 place_id가 있으면 덮어쓴다.
export async function setCachedPlace(place: Place, detail: PlaceDetail): Promise<void> {
  const now = Date.now();
  const { error } = await createDbClient()
    .from(TABLE_NAME)
    .upsert(
      {
        place_id: String(place.id),
        data: { place, detail },
        fetched_at: new Date(now).toISOString(),
        expires_at: new Date(now + CACHE_TTL_MS).toISOString(),
      },
      { onConflict: "place_id" },
    )
    .abortSignal(AbortSignal.timeout(DB_TIMEOUT_MS));
  if (error) throw dbUnavailableError(error);
}
