// 코스 결과 화면의 안내 문구를 만든다. 후보가 없어서 빼고 만든 유형(missingTypes)마다 한 줄이다.
// 지역 이름은 만들지 않는다. 코스에는 시도·시군구 코드만 있고, 코드를 이름으로 바꾸려면 추가 API 호출이 필요하다.
// TODO: 지역 이름 칩. 시도 이름은 getSidoList()로 얻을 수 있지만 관광공사를 부를 수 있어서 이번 단계에서는 만들지 않았다.
import type { MissingType } from "@/lib/course/types";
import { getContentTypeLabel } from "@/lib/tour/contentTypes";

export function missingTypeNotices(missingTypes: readonly MissingType[]): string[] {
  return missingTypes.flatMap((missing) => {
    const label = getContentTypeLabel(missing.contentTypeId);
    if (label === undefined) return [];
    return missing.reason === "no-data"
      ? [`${label} 장소가 이 지역에 없어서 빼고 만들었어요.`]
      : [`${label} 장소가 가까운 곳에 없어서 빼고 만들었어요.`];
  });
}

export function placeCountLabel(count: number): string {
  return `장소 ${count}곳`;
}
