import Button from "@/components/Button";
import VisitCheckNotice from "@/components/VisitCheckNotice";
import StepCard from "@/components/home/StepCard";

// 홈은 데이터를 불러오지 않는 정적 화면이다. 그래서 로딩, 빈 결과, 오류 상태가 없다.
// 문구는 DESIGN.md의 "세부 문구 확정"이 정해지기 전의 초안이다. 동반 가능을 단정하지 않는다. (동반 정보는 틀릴 수 있다)
// 주 버튼은 한 화면에 하나만 둔다. (히어로의 "코스 만들기")
const STEPS = [
  { title: "지역과 유형 고르기", description: "가고 싶은 지역과 장소 유형을 골라요." },
  { title: "코스 정하기", description: "동반 정보가 있는 장소 후보 중에서 방문 순서를 정해 드려요." },
  { title: "지도에서 확인하기", description: "코스를 지도와 카드로 보고, 링크로 나눌 수 있어요." },
];

// 히어로 진입 애니메이션 지연(ms). 위에서 아래로 80ms 간격이다.
const HERO_DELAY_MS = { title: 0, lead: 80, sub: 160, actions: 240 };

export default function Home() {
  return (
    <main className="mx-auto w-full max-w-md flex-1 px-4 pb-12 pt-6 md:max-w-3xl">
      <section className="rounded-card bg-primary-soft p-6">
        <h1 className="home-fade-up text-2xl font-bold" style={{ animationDelay: `${HERO_DELAY_MS.title}ms` }}>
          하루 코스를 만들어요
        </h1>
        <p className="home-fade-up mt-2 text-base text-muted" style={{ animationDelay: `${HERO_DELAY_MS.lead}ms` }}>
          동반 정보가 있는 장소로 하루 코스를 만들어요.
        </p>
        <p className="home-fade-up mt-2 text-base text-muted" style={{ animationDelay: `${HERO_DELAY_MS.sub}ms` }}>
          지역과 장소 유형을 고르면 코스를 정해 드려요.
        </p>

        <div
          className="home-fade-up mt-6 flex flex-col gap-3 md:flex-row"
          style={{ animationDelay: `${HERO_DELAY_MS.actions}ms` }}
        >
          <Button href="/course/new">코스 만들기</Button>
          <Button href="/places" variant="secondary">
            장소 둘러보기
          </Button>
        </div>
      </section>

      <section className="mt-8">
        <h2 className="text-xl font-bold">이렇게 만들어요</h2>
        <ol className="mt-4 grid gap-3 md:grid-cols-3">
          {STEPS.map((step, index) => (
            <StepCard key={step.title} step={index + 1} title={step.title} description={step.description} />
          ))}
        </ol>
      </section>

      <section className="mt-8 flex flex-col items-start gap-2">
        <VisitCheckNotice />
        <p className="text-base text-muted">동반 조건과 운영시간은 달라질 수 있어요. 방문 전에 꼭 확인해 주세요.</p>
      </section>

      <p className="mt-8 text-center text-base text-muted">장소 정보는 한국관광공사 데이터를 바탕으로 해요.</p>
    </main>
  );
}
