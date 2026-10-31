import type { Metadata } from "next";
import { connection } from "next/server";
import CourseForm from "@/components/course/CourseForm";
import { AppError } from "@/lib/errors";
import { getSidoList } from "@/lib/tour/regions";
import type { SidoListState } from "@/types";

export const metadata: Metadata = {
  title: "코스 만들기 | 발자국",
};

// 시도 목록을 못 가져와도 페이지는 열린다. 오류 내용은 화면에 넘기지 않고 이름만 서버 로그에 남긴다.
// TODO: places/page.tsx의 loadSidoState와 같은 코드다. 합치려면 places 쪽도 바꿔야 해서 이번 단계에서는 두었다.
async function loadSidoState(): Promise<SidoListState> {
  try {
    const { regions } = await getSidoList();
    return regions.length > 0 ? { status: "ok", regions } : { status: "empty" };
  } catch (e) {
    console.error("시도 목록 조회 실패:", e instanceof AppError ? e.code : e instanceof Error ? e.name : typeof e);
    return { status: "error" };
  }
}

export default async function NewCoursePage() {
  // 빌드 때 한 번 실행되어 굳지 않도록 요청이 올 때까지 렌더링을 미룬다.
  await connection();
  const sidoState = await loadSidoState();
  return <CourseForm sidoState={sidoState} />;
}
