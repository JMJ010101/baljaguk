"use client";

import { useEffect, useRef, useState } from "react";
import Button from "@/components/Button";
import { KakaoMapLoadError, loadKakaoMaps, type MapLoadFailure } from "@/components/course/kakaoMapSdk";
import {
  KAKAO_MAP_BOUNDS_PADDING_PX,
  KAKAO_MAP_LOAD_WAIT_MS,
  KAKAO_MAP_ROUTE_STROKE_OPACITY,
  KAKAO_MAP_ROUTE_STROKE_STYLE,
  KAKAO_MAP_ROUTE_STROKE_WEIGHT_PX,
  KAKAO_MAP_SINGLE_STOP_LEVEL,
} from "@/lib/course/constants";
import { buildRoutePath, type MapStop } from "@/lib/course/mapStops";

// 코스 결과의 지도다. 번호 마커는 카드의 순서 번호와 같다. 마커는 누르는 요소가 아니라 표시일 뿐이다. (DESIGN.md: 누르는 요소는 44px 이상)
// 지도가 실패해도 코스 카드 목록은 그대로 보인다. 문구는 DESIGN.md의 "세부 문구 확정"이 정해지기 전의 초안이다.
// 장소 이름은 외부 데이터라 마커에는 번호만 넣고, 이름은 카드에서 본다.
// TODO(확인 필요): 모바일에서 지도 위를 스와이프할 때 페이지 스크롤이 막히는지는 브라우저로 확인하지 못했다.
const NO_LOCATION_TEXT = "위치 정보가 있는 장소가 없어서 지도를 표시할 수 없어요.";
const LOADING_TEXT = "지도를 불러오고 있어요";
const FAILED_TITLE = "지도를 불러오지 못했어요";
const FAILED_DESCRIPTION = "코스 목록은 아래에서 그대로 볼 수 있어요.";
const RETRY_LABEL = "지도 다시 불러오기";
const MAP_LABEL = "코스 장소 위치 지도";
const ROUTE_NOTICE = "점선은 방문 순서를 보여 주는 직선이에요. 실제 이동 경로가 아니에요.";

type Status = { kind: "loading" } | { kind: "ready"; routeDrawn: boolean } | { kind: "failed"; reason: MapLoadFailure };

export default function CourseMap({ stops, hiddenCount }: { stops: MapStop[]; hiddenCount: number }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<Status>({ kind: "loading" });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const container = containerRef.current;
    if (stops.length === 0 || container === null) return;
    let cancelled = false;
    const overlays: { setMap(map: null): void }[] = [];

    // 키는 빌드 때 치환되도록 이 이름 그대로 참조한다. 이 값이 NEXT_PUBLIC_ 접두사를 쓰는 유일한 변수다.
    loadKakaoMaps(process.env.NEXT_PUBLIC_KAKAO_JS_KEY, KAKAO_MAP_LOAD_WAIT_MS).then(
      (maps) => {
        if (cancelled) return;
        try {
          const points = stops.map((stop) => new maps.LatLng(stop.latitude, stop.longitude));
          const map = new maps.Map(container, { center: points[0], level: KAKAO_MAP_SINGLE_STOP_LEVEL });
          if (points.length > 1) {
            const bounds = new maps.LatLngBounds();
            points.forEach((point) => bounds.extend(point));
            const pad = KAKAO_MAP_BOUNDS_PADDING_PX;
            map.setBounds(bounds, pad, pad, pad, pad);
          }
          // 순서 연결선: 선 색은 CSS 변수 --color-primary를 읽어 쓴다. 값이 비면 선만 생략하고 마커는 그대로 둔다.
          let routeDrawn = false;
          const route = buildRoutePath(stops);
          const strokeColor = getComputedStyle(document.documentElement).getPropertyValue("--color-primary").trim();
          if (route !== null && strokeColor !== "") {
            const line = new maps.Polyline({
              path: route.map((point) => new maps.LatLng(point.latitude, point.longitude)),
              strokeWeight: KAKAO_MAP_ROUTE_STROKE_WEIGHT_PX,
              strokeColor,
              strokeOpacity: KAKAO_MAP_ROUTE_STROKE_OPACITY,
              strokeStyle: KAKAO_MAP_ROUTE_STROKE_STYLE,
            });
            line.setMap(map);
            overlays.push(line);
            routeDrawn = true;
          }
          stops.forEach((stop, index) => {
            const marker = document.createElement("div");
            marker.className =
              "pointer-events-none flex size-7 items-center justify-center rounded-tag bg-primary text-sm font-bold text-on-primary";
            marker.textContent = String(stop.order);
            const overlay = new maps.CustomOverlay({ position: points[index], content: marker, xAnchor: 0.5, yAnchor: 0.5 });
            overlay.setMap(map);
            overlays.push(overlay);
          });
          setStatus({ kind: "ready", routeDrawn });
        } catch {
          console.error("카카오 지도 그리기 실패");
          setStatus({ kind: "failed", reason: "script-error" });
        }
      },
      (error: unknown) => {
        if (cancelled) return;
        const reason = error instanceof KakaoMapLoadError ? error.reason : "script-error";
        console.error("카카오 지도 로드 실패:", reason);
        setStatus({ kind: "failed", reason });
      },
    );

    return () => {
      cancelled = true;
      overlays.forEach((overlay) => overlay.setMap(null));
      container.replaceChildren();
    };
  }, [stops, attempt]);

  if (stops.length === 0) {
    return <p className="mt-6 rounded-card bg-primary-soft px-4 py-3 text-base">{NO_LOCATION_TEXT}</p>;
  }

  return (
    <section className="mt-6">
      <div className="relative h-64 w-full overflow-hidden rounded-card bg-primary-soft">
        <div ref={containerRef} role="img" aria-label={MAP_LABEL} className="size-full" />
        {status.kind === "loading" && (
          <div role="status" className="absolute inset-0 flex items-center justify-center px-4 text-base text-muted">
            {LOADING_TEXT}
          </div>
        )}
        {status.kind === "failed" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-primary-soft px-4 text-center">
            <p className="text-lg font-bold">{FAILED_TITLE}</p>
            <p className="text-base text-muted">{FAILED_DESCRIPTION}</p>
            {status.reason !== "no-key" && (
              <Button
                hover={false}
                variant="secondary"
                onClick={() => {
                  setStatus({ kind: "loading" });
                  setAttempt((count) => count + 1);
                }}
              >
                {RETRY_LABEL}
              </Button>
            )}
          </div>
        )}
      </div>
      {status.kind === "ready" && status.routeDrawn && <p className="mt-2 text-base text-muted">{ROUTE_NOTICE}</p>}
      {hiddenCount > 0 && (
        <p className="mt-2 text-base text-muted">위치 정보가 없는 장소 {hiddenCount}곳은 지도에 표시하지 않았어요.</p>
      )}
    </section>
  );
}
