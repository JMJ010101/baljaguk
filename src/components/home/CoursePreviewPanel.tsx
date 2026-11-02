import PreviewMap from "@/components/home/PreviewMap";

// 홈 히어로 위의 "예시 코스" 카드다. 지도 위에 큰 문구가 있고, 그 아래 직접 그린 추상 지도에 점선 길과 번호 핀, 강아지 발자국이 이어진다.
// 문구는 제목(h1)이 아니라 문단(p)이다. 홈의 h1은 히어로 하나다. 동반 가능을 단정하지 않는다.
// 실제 장소가 아니다. 장소 이름과 지명은 없다. 서버 컴포넌트이고 이미지 파일은 없다.
//
// 진입 순서(한 번만 재생): 1줄 0ms → 2줄 120ms(기존 home-fade-up) → "발자국" 형광펜 띠 500ms(home-sweep-in).
// 동작 줄이기에서는 효과가 없어서 띠까지 완성된 모습이 처음부터 보인다. 기존 히어로(0~240ms)와 카드(320ms부터)의 지연값은 바꾸지 않는다.
const LINE_DELAY_MS = [0, 120];
const SWEEP_DELAY_MS = 500;

export default function CoursePreviewPanel() {
  return (
    <div className="mb-4 rounded-card bg-surface p-4 shadow-card md:mb-6 md:p-6 motion-safe:transition-[scale] motion-safe:duration-150 motion-safe:hover:scale-[1.02]">
      <p className="mb-4 text-center text-3xl font-bold leading-tight text-foreground md:text-4xl">
        <span className="home-fade-up block" style={{ animationDelay: `${LINE_DELAY_MS[0]}ms` }}>
          우리 아이와의 하루,
        </span>
        <span className="home-fade-up block" style={{ animationDelay: `${LINE_DELAY_MS[1]}ms` }}>
          {/* 강조 단어. 글자색, 굵기, 아래 형광펜 띠를 함께 써서 색만으로 구분하지 않는다. 띠는 글자 뒤에 깔린다. (isolate로 카드 배경 아래로 숨지 않게 한다) */}
          <span className="relative isolate inline-block text-primary">
            발자국
            <span
              aria-hidden="true"
              className="home-sweep-in absolute inset-x-0 bottom-0.5 -z-10 h-3 origin-left rounded-tag bg-primary-soft"
              style={{ animationDelay: `${SWEEP_DELAY_MS}ms` }}
            />
          </span>
          이 이어져요
        </span>
      </p>
      <PreviewMap />
    </div>
  );
}
