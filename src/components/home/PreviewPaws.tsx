// "예시 코스" 지도 위의 강아지 발자국이다. 1번 핀에서 시작해 점선 길을 따라 하나씩 찍혀 3번 핀 쪽으로 이어진다.
// 완성 모습에서는 전부 찍혀 있다. 움직임은 전역 CSS의 home-pop-in이고, 동작 줄이기에서는 효과가 없어서 처음부터 전부 보인다.
// 동물 그림은 없고 발바닥 도형(둥근 삼각형 발바닥과 길쭉한 발가락 네 개)만 쓴다. 색은 전역 CSS의 테마 색이다. (글자가 아니다)
//
// 지도는 칸 크기에 맞춰 늘어나서 길의 방향이 화면 폭에 따라 달라진다. 그래서 위치와 각도를 모바일용(지도 약 330x208 기준)과
// 데스크톱용(약 800x320 기준)으로 따로 계산해 두었다. 길을 따라 일정한 간격으로 놓고, 왼발과 오른발처럼 길 양옆으로 12px씩 번갈아 어긋나게 했다.
// 두 번째 핀 가까이에는 찍지 않는다. 각도는 발가락이 진행 방향을 향하도록 돌린 값이다.
type Print = { left: string; top: string; rotate: string };

const MOBILE_PRINTS: Print[] = [
  { left: "25.1%", top: "66.6%", rotate: "48deg" },
  { left: "25.6%", top: "48.8%", rotate: "40deg" },
  { left: "36.5%", top: "46.2%", rotate: "42deg" },
  { left: "65.1%", top: "37.1%", rotate: "128deg" },
  { left: "67.3%", top: "54.5%", rotate: "127deg" },
  { left: "78.1%", top: "51.8%", rotate: "115deg" },
];

const DESKTOP_PRINTS: Print[] = [
  { left: "18.1%", top: "70.9%", rotate: "77deg" },
  { left: "23.4%", top: "56.9%", rotate: "58deg" },
  { left: "30.8%", top: "52.6%", rotate: "53deg" },
  { left: "34.9%", top: "36.2%", rotate: "58deg" },
  { left: "42.5%", top: "35.4%", rotate: "73deg" },
  { left: "56.5%", top: "30.7%", rotate: "109deg" },
  { left: "61.8%", top: "44.6%", rotate: "116deg" },
  { left: "69.5%", top: "45.7%", rotate: "116deg" },
  { left: "74.9%", top: "59.6%", rotate: "109deg" },
  { left: "82.3%", top: "55.5%", rotate: "90deg" },
];

// 진입 애니메이션 지연(ms). 지도(0~400ms), 핀(450~1150ms), 점선(1100~1600ms)이 먼저 나타난 뒤 발자국이 하나씩 찍힌다.
const FIRST_PRINT_DELAY_MS = 1700;
const PRINT_STEP_MS = 190;

// 위쪽을 향하는 강아지 발자국 하나다. 중심이 (0, 0)이고 가로세로 약 16px이다.
function DogPrint({ print, index }: { print: Print; index: number }) {
  return (
    <svg
      viewBox="-10 -10 20 20"
      width="20"
      height="20"
      className="home-pop-in absolute fill-primary"
      style={{
        left: print.left,
        top: print.top,
        translate: "-50% -50%",
        rotate: print.rotate,
        animationDelay: `${FIRST_PRINT_DELAY_MS + index * PRINT_STEP_MS}ms`,
      }}
    >
      <path d="M-5 7.5 Q-5.5 5 -2.5 2 Q0 0 2.5 2 Q5.5 5 5 7.5 Q4.5 9 0 9 Q-4.5 9 -5 7.5 Z" />
      <ellipse cx="-6.2" cy="-1" rx="1.9" ry="2.7" transform="rotate(-22 -6.2 -1)" />
      <ellipse cx="-2.4" cy="-4.8" rx="1.9" ry="2.7" transform="rotate(-7 -2.4 -4.8)" />
      <ellipse cx="2.4" cy="-4.8" rx="1.9" ry="2.7" transform="rotate(7 2.4 -4.8)" />
      <ellipse cx="6.2" cy="-1" rx="1.9" ry="2.7" transform="rotate(22 6.2 -1)" />
    </svg>
  );
}

export default function PreviewPaws() {
  return (
    <>
      <div className="md:hidden">
        {MOBILE_PRINTS.map((print, index) => (
          <DogPrint key={print.left} print={print} index={index} />
        ))}
      </div>
      <div className="hidden md:block">
        {DESKTOP_PRINTS.map((print, index) => (
          <DogPrint key={print.left} print={print} index={index} />
        ))}
      </div>
    </>
  );
}
