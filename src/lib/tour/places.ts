import { AppError } from "@/lib/errors";
import { fetchAreaBasedList } from "@/lib/tour/client";
import { normalizePlace } from "@/lib/tour/normalize";
import type { Place } from "@/types";

export type PlacesResult = {
  places: Place[];
  skipped: number;
  totalCount?: number;
};

// 원본 응답 전체는 로그에 남기지 않는다. 항목 위치와 contentid(있을 때만)만 남긴다.
function describeItem(raw: unknown, index: number): string {
  const contentid = (raw as { contentid?: unknown } | null)?.contentid;
  return `index=${index}${typeof contentid === "string" ? ` contentid=${contentid}` : ""}`;
}

// 장소 하나의 normalize가 실패해도 목록 전체를 실패시키지 않고 그 장소만 건너뛴다.
export async function getPlaces(params: {
  numOfRows: number;
  pageNo: number;
  contentTypeId?: number;
  arrange?: string;
  lDongRegnCd?: string;
}): Promise<PlacesResult> {
  const { items, totalCount } = await fetchAreaBasedList(params);
  const places: Place[] = [];
  let skipped = 0;

  items.forEach((raw, index) => {
    try {
      places.push(normalizePlace(raw));
    } catch (e) {
      skipped++;
      const reason = e instanceof AppError ? e.code : "UNKNOWN";
      console.warn(`장소 normalize 실패로 건너뜀: ${describeItem(raw, index)} reason=${reason}`);
    }
  });

  return { places, skipped, totalCount };
}
