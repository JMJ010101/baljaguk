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
  // 이미지 저작권 구분(cpyrhtDivCd). 값을 그대로 보관만 한다.
  imageCopyright?: string;
  modifiedTime?: string;
};

// 장소 상세 정보(detailPetTour2 + detailIntro2를 normalize한 결과)다.
// 값이 없으면 undefined다. undefined인 항목은 "방문 전 확인 필요" 표시 대상이 된다.
// 아래 값은 모두 자유 텍스트이므로 파싱하지 않고 문자열 그대로 보여준다.
export type PlaceDetail = {
  placeId: Place["id"];
  // 동반 정보 (detailPetTour2)
  acmpyTypeCd?: string;
  acmpyPsblCpam?: string;
  acmpyNeedMtr?: string;
  etcAcmpyInfo?: string;
  relaAcdntRiskMtr?: string;
  // 운영시간, 쉬는 날 (detailIntro2, 타입별 필드명이 달라 하나로 모은다)
  hours?: string;
  rest?: string;
};
