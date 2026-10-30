// 장소 탐색에서 허용하는 contentTypeId와 이름이다. (CLAUDE.md의 코드표)
// 클라이언트에서도 쓰므로 server-only인 client.ts를 import하지 않는다.
export const CONTENT_TYPES = [
  { id: 12, label: "관광지" },
  { id: 14, label: "문화시설" },
  { id: 15, label: "행사/공연/축제" },
  { id: 28, label: "레포츠" },
  { id: 32, label: "숙박" },
  { id: 38, label: "쇼핑" },
  { id: 39, label: "음식점" },
] as const;

export const DEFAULT_CONTENT_TYPE_ID = 12;

export const CONTENT_TYPE_IDS: readonly number[] = CONTENT_TYPES.map((type) => type.id);

export function getContentTypeLabel(contentTypeId: number): string | undefined {
  return CONTENT_TYPES.find((type) => type.id === contentTypeId)?.label;
}
