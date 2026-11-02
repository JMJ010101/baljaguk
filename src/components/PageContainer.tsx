import type { ReactNode } from "react";

// 화면 본문(<main>)의 폭과 여백을 한 곳에서 정한다.
// 클래스는 완전한 문자열 상수로만 둔다. Tailwind는 소스에 있는 완전한 클래스 문자열만 인식하므로 조각을 이어 붙여 만들지 않는다.
const WITH_TOP = "mx-auto w-full max-w-md flex-1 px-4 pb-12 pt-6";
const NO_TOP = "mx-auto w-full max-w-md flex-1 px-4 pb-12";

// md(768px) 이상에서만 폭을 넓힌다. 모바일은 위 기본 클래스의 max-w-md 그대로다.
// wide: Header, 홈, 장소 목록 / reading: 장소 상세, 코스 만들기, 코스 결과
export const PAGE_WIDTH_CLASS = {
  wide: "md:max-w-5xl",
  reading: "md:max-w-2xl",
} as const;

type Props = {
  children: ReactNode;
  // 위 여백(pt-6)을 둘지 정한다. 장소 상세는 맨 위가 "목록으로" 행이라 두지 않는다.
  top?: boolean;
  // 데스크톱 폭 단계. 필수다. 모든 화면이 폭을 정해야 한다.
  width: keyof typeof PAGE_WIDTH_CLASS;
};

export default function PageContainer({ children, top = true, width }: Props) {
  const base = top ? WITH_TOP : NO_TOP;
  const className = `${base} ${PAGE_WIDTH_CLASS[width]}`;
  return <main className={className}>{children}</main>;
}
