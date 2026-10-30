import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import PlaceDetailStatus from "@/components/places/PlaceDetailStatus";
import PlaceDetailView from "@/components/places/PlaceDetailView";
import { AppError } from "@/lib/errors";
import { parsePlaceId } from "@/lib/placeId";
import { buildPlacesHref, parseBackQuery } from "@/lib/placesQuery";
import { enforcePlacesRateLimit } from "@/lib/rateLimit";
import { getPlaceDetail } from "@/lib/tour/placeDetail";

export const metadata: Metadata = {
  title: "장소 상세 | 발자국",
};

type LoadResult =
  | { ok: true; data: Awaited<ReturnType<typeof getPlaceDetail>> }
  | { ok: false; code: string; message: string };

// 조회와 오류 분류만 한다. (react-hooks/error-boundaries 때문에 JSX는 try 밖에서 만든다.)
// 캐시에 없어서 관광공사를 부를 때만 호출 한도를 센다. (캐시 적중은 세지 않는다)
async function loadDetail(placeId: number, requestHeaders: Headers): Promise<LoadResult> {
  try {
    return {
      ok: true,
      data: await getPlaceDetail(placeId, { beforeTourCalls: () => enforcePlacesRateLimit(requestHeaders) }),
    };
  } catch (e) {
    // AppError가 아닌 예외는 app/error.tsx에 맡긴다.
    if (!(e instanceof AppError)) throw e;
    // 존재하지 않는 장소(404)와 올바르지 않은 id(400)는 둘 다 "유효하지 않은 링크"다.
    if (e.code === "INVALID_INPUT") notFound();
    console.error("장소 상세 조회 실패:", e.code);
    return { ok: false, code: e.code, message: e.userMessage };
  }
}

// 서버 컴포넌트에서 getPlaceDetail()을 직접 호출한다. (자기 API를 다시 부르지 않는다.)
// 키와 DB 접근은 서버 쪽 lib에서만 일어난다.
export default async function PlaceDetailPage({ params, searchParams }: PageProps<"/places/[id]">) {
  const { id } = await params;

  // 목록의 선택 값(?sido=&type=&page=)을 읽어 "목록으로" 주소를 만든다. 잘못된 값은 기본값이 된다.
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(await searchParams)) {
    if (typeof value === "string") search.set(key, value);
  }
  const backHref = buildPlacesHref(parseBackQuery(search));

  const placeId = parsePlaceId(id);
  if (placeId === undefined) notFound();

  const result = await loadDetail(placeId, await headers());
  if (!result.ok) return <PlaceDetailStatus code={result.code} message={result.message} backHref={backHref} />;
  return <PlaceDetailView place={result.data.place} detail={result.data.detail} backHref={backHref} />;
}
