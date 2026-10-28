// 관광공사 API 응답을 normalize한 뒤의 장소 타입이다.
// 값이 없는 필드는 빈 문자열이 아니라 undefined로 둔다.
export type Place = {
  id: number;
  contentTypeId: number;
  title: string;
  address?: string;
  // mapx(경도), mapy(위도). 선택 항목이라 비어 있을 수 있다.
  longitude?: number;
  latitude?: number;
  imageUrl?: string;
  modifiedTime?: string;
};
