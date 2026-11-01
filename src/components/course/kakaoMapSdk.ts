// 카카오맵 JavaScript SDK를 브라우저에서 불러온다. CourseMap에서만 쓰고 서버에서는 부르지 않는다.
// 패키지를 설치하지 않고 스크립트 태그를 동적으로 넣는다. 지도 코드는 autoload=false로 불러온 뒤 kakao.maps.load 콜백 안에서 실행한다.
// TODO(확인 필요): autoload=false와 kakao.maps.load는 공식 문서(apis.map.kakao.com/web/documentation)에 있다고 검색 요약으로만 확인했고 원문 코드는 읽지 못했다.
// 아래 타입은 쓰는 부분만 손으로 선언한 것이다. (타입 패키지는 설치하지 않는다)
// 키는 NEXT_PUBLIC_ 접두사를 허용하는 유일한 예외인 카카오 JavaScript 키다. 이 파일은 키를 직접 읽지 않고 호출하는 쪽이 넘긴다.
const SDK_URL = "https://dapi.kakao.com/v2/maps/sdk.js";

type KakaoLatLng = object;
type KakaoOverlayHandle = { setMap(map: KakaoMapHandle | null): void };
export type KakaoMapHandle = {
  setBounds(bounds: object, paddingTop?: number, paddingRight?: number, paddingBottom?: number, paddingLeft?: number): void;
};
export type KakaoMaps = {
  load(callback: () => void): void;
  LatLng: new (latitude: number, longitude: number) => KakaoLatLng;
  LatLngBounds: new () => { extend(latLng: KakaoLatLng): void };
  Map: new (container: HTMLElement, options: { center: KakaoLatLng; level: number }) => KakaoMapHandle;
  CustomOverlay: new (options: {
    position: KakaoLatLng;
    content: HTMLElement;
    xAnchor?: number;
    yAnchor?: number;
    zIndex?: number;
  }) => KakaoOverlayHandle;
};

declare global {
  interface Window {
    kakao?: { maps?: KakaoMaps };
  }
}

// 사용자 화면에는 원인을 구분해 보여 주지 않는다. 브라우저 콘솔에 이 분류 이름만 남긴다.
// 도메인 미등록은 카카오가 어떻게 응답하는지 문서에 없어 구분하지 못하고, 스크립트 오류나 시간 초과로 나타날 수 있다.
export type MapLoadFailure = "no-key" | "script-error" | "timeout";

export class KakaoMapLoadError extends Error {
  constructor(public readonly reason: MapLoadFailure) {
    super(reason);
    this.name = "KakaoMapLoadError";
  }
}

// 성공한 약속만 다시 쓴다. 실패하면 비워서 "지도 다시 불러오기"가 새로 시도하게 한다.
let loading: Promise<KakaoMaps> | undefined;

export function loadKakaoMaps(appKey: string | undefined, waitMs: number): Promise<KakaoMaps> {
  if (appKey === undefined || appKey === "") return Promise.reject(new KakaoMapLoadError("no-key"));
  if (loading !== undefined) return loading;

  const attempt = new Promise<KakaoMaps>((resolve, reject) => {
    const script = document.createElement("script");
    let settled = false;
    const fail = (reason: MapLoadFailure) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      script.remove();
      loading = undefined;
      reject(new KakaoMapLoadError(reason));
    };
    const timer = setTimeout(() => fail("timeout"), waitMs);

    script.src = `${SDK_URL}?appkey=${encodeURIComponent(appKey)}&autoload=false`;
    script.async = true;
    script.onerror = () => fail("script-error");
    script.onload = () => {
      const maps = window.kakao?.maps;
      if (maps === undefined) return fail("script-error");
      maps.load(() => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        resolve(maps);
      });
    };
    document.head.appendChild(script);
  });
  loading = attempt;
  return attempt;
}
