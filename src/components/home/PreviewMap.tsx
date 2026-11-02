import PreviewPaws from "@/components/home/PreviewPaws";

// "예시 코스" 카드의 지도 영역이다. 추상적인 지도 느낌의 면에 점선 길과 번호 핀 세 개가 있고, 그 위로 강아지 발자국이 이어진다.
// 한반도 윤곽, 지명, 장소 이름은 없다. 그림 전체를 하나의 이미지로 보고 설명 글(aria-label)을 단다.
// 색은 전역 CSS의 테마 색(bg-*, fill-*, stroke-*)만 쓴다. 지도 SDK는 쓰지 않는다. 서버 컴포넌트다.
//
// 진입 순서(한 번만 재생): 지도 0ms → 핀 450/600/750ms → 점선 1100ms → 발자국(PreviewPaws) 1700ms부터 190ms 간격.
// 효과는 전역 CSS(home-fade-up, home-pop-in, home-fade-in)이고, 동작 줄이기에서는 효과가 없어서 완성 모습이 처음부터 보인다.

// 핀 위치(%)와 나타나는 지연(ms)이다. 위치는 점선 길이 지나는 점과 같은 비율이라 길과 핀이 어긋나지 않는다.
const PINS = [
  { left: "14%", top: "68%", delayMs: 450 },
  { left: "48%", top: "30%", delayMs: 600 },
  { left: "86%", top: "58%", delayMs: 750 },
];
const ROUTE_DELAY_MS = 1100;

export default function PreviewMap() {
  return (
    <div
      role="img"
      aria-label="지도 위에 번호 1, 2, 3 지점이 점선으로 이어지고 강아지 발자국이 찍힌 예시 그림"
      className="home-fade-up relative h-52 overflow-hidden rounded-button bg-primary-soft md:h-80"
    >
      {/* 칸 크기에 맞춰 늘어나는 배경이다. 선 굵기는 늘어나지 않게 non-scaling-stroke를 쓴다. */}
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 size-full">
        {/* 언덕 */}
        <path d="M0 100 V84 C18 74 32 90 50 82 S82 72 100 84 V100 Z" className="fill-accent/20" />
        {/* 지도 격자 */}
        <path
          d="M0 25 H100 M0 50 H100 M0 75 H100 M25 0 V100 M50 0 V100 M75 0 V100"
          className="stroke-accent/20"
          strokeWidth="1"
          vectorEffect="non-scaling-stroke"
          fill="none"
        />
        {/* 점선 길 */}
        <path
          d="M14 68 C26 70 34 28 48 30 S74 66 86 58"
          className="home-fade-in stroke-primary"
          style={{ animationDelay: `${ROUTE_DELAY_MS}ms` }}
          strokeWidth="2.5"
          strokeDasharray="2 6"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
          fill="none"
        />
      </svg>
      <PreviewPaws />
      {PINS.map((pin, index) => (
        <span
          key={pin.left}
          className="home-pop-in absolute flex size-7 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-tag border-2 border-surface bg-primary text-sm font-bold text-on-primary"
          style={{ left: pin.left, top: pin.top, animationDelay: `${pin.delayMs}ms` }}
        >
          {index + 1}
        </span>
      ))}
    </div>
  );
}
