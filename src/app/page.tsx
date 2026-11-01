import Button from "@/components/Button";

// 홈은 데이터를 불러오지 않는 정적 화면이다. 그래서 로딩, 빈 결과, 오류 상태가 없다.
// 문구는 DESIGN.md의 "세부 문구 확정"이 정해지기 전의 초안이다. 동반 가능을 단정하지 않는다. (동반 정보는 틀릴 수 있다)
// TODO(확인 필요): 와이어프레임의 대표 이미지 자리, "이렇게 만들어요" 카드, 소개/프롬프트 비교 링크는 이번 범위가 아니라 만들지 않았다.
export default function Home() {
  return (
    <main className="mx-auto w-full max-w-md flex-1 px-4 pb-12 pt-6">
      <h1 className="text-2xl font-bold">하루 코스를 만들어요</h1>
      <p className="mt-2 text-base text-muted">동반 정보가 있는 장소로 하루 코스를 만들어요.</p>
      <p className="mt-2 text-base text-muted">지역과 장소 유형을 고르면 코스를 정해 드려요. 방문 전에는 꼭 확인해 주세요.</p>

      <div className="mt-8 flex flex-col gap-3">
        <Button href="/course/new">코스 만들기</Button>
        <Button href="/places" variant="secondary">
          장소 둘러보기
        </Button>
      </div>

      <p className="mt-8 text-center text-base text-muted">장소 정보는 한국관광공사 데이터를 바탕으로 해요.</p>
    </main>
  );
}
