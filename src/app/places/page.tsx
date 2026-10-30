import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import PlacesExplorer from "@/components/places/PlacesExplorer";
import { PlacesLoading } from "@/components/places/PlacesStatus";
import { AppError } from "@/lib/errors";
import { getSidoList } from "@/lib/tour/regions";
import type { SidoListState } from "@/types";

export const metadata: Metadata = {
  title: "장소 둘러보기 | 발자국",
};

// 시도 목록을 못 가져와도 페이지는 열린다. 오류 내용은 화면에 넘기지 않고 이름만 서버 로그에 남긴다.
async function loadSidoState(): Promise<SidoListState> {
  try {
    const { regions } = await getSidoList();
    return regions.length > 0 ? { status: "ok", regions } : { status: "empty" };
  } catch (e) {
    console.error("시도 목록 조회 실패:", e instanceof AppError ? e.code : e instanceof Error ? e.name : typeof e);
    return { status: "error" };
  }
}

export default async function PlacesPage() {
  // 빌드 때 한 번 실행되어 굳지 않도록 요청이 올 때까지 렌더링을 미룬다.
  await connection();
  const sidoState = await loadSidoState();

  return (
    <main className="mx-auto w-full max-w-md flex-1 px-4 pb-12 pt-6">
      <h1 className="text-2xl font-bold">장소 둘러보기</h1>
      <p className="mt-2 text-base text-muted">반려동물과 함께 갈 수 있는 장소예요.</p>
      <div className="mt-6">
        {/* useSearchParams를 쓰는 클라이언트 컴포넌트는 Suspense 안에 둔다. */}
        <Suspense fallback={<PlacesLoading />}>
          <PlacesExplorer sidoState={sidoState} />
        </Suspense>
      </div>
      <p className="mt-8 text-center text-base text-muted">장소 정보와 사진은 한국관광공사 데이터를 바탕으로 해요.</p>
    </main>
  );
}
