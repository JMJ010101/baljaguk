import type { Metadata } from "next";
import { connection } from "next/server";
import CourseForm from "@/components/course/CourseForm";
import { parseRecreatePrefill, resolveFormPrefill } from "@/lib/course/prefill";
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

// ?sido=&sigungu=&types= 는 "다시 만들기"가 싣는 미리 채우기 값이다. 잘못된 값은 조용히 버리고 mood는 읽지 않는다.
export default async function NewCoursePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  // 빌드 때 한 번 실행되어 굳지 않도록 요청이 올 때까지 렌더링을 미룬다.
  await connection();
  const [sidoState, query] = await Promise.all([loadSidoState(), searchParams]);
  // 시도 목록을 쓸 수 없으면 미리 채운 시도와 시군구는 버린다. (대조할 수 없다)
  const sidoCodes = sidoState.status === "ok" ? sidoState.regions.map((region) => region.code) : undefined;
  const prefill = resolveFormPrefill(parseRecreatePrefill(query), sidoCodes);
  // 쿼리가 바뀌면 폼을 새로 만든다. (입력 중이던 값은 사라진다)
  const formKey = `${prefill.sido}|${prefill.sigungu}|${prefill.types.join(",")}`;
  return <CourseForm key={formKey} sidoState={sidoState} prefill={prefill} />;
}
