// 장소 주소의 앞부분에서 지역 이름을 뽑는다. 코스는 시도·시군구 코드만 저장하고 이름은 저장하지 않아서 주소에서 만든다.
// 시도만 고르면 첫 토큰, 시군구까지 고르면 앞 두 토큰이다. 주소가 없으면 undefined이고, 대신 보여 줄 문구는 호출하는 쪽이 정한다.
export function regionNameFromAddress(address: string | undefined, hasSigungu: boolean): string | undefined {
  const tokens = address?.trim().split(/\s+/).filter(Boolean) ?? [];
  if (tokens.length === 0) return undefined;
  return hasSigungu ? tokens.slice(0, 2).join(" ") : tokens[0];
}
