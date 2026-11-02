import type { ReactNode } from "react";

// 화면 본문(<main>)의 폭과 여백을 한 곳에서 정한다.
// 클래스는 완전한 문자열 상수로만 둔다. Tailwind는 소스에 있는 완전한 클래스 문자열만 인식하므로 이어 붙여 만들지 않는다.
const WITH_TOP = "mx-auto w-full max-w-md flex-1 px-4 pb-12 pt-6";
const NO_TOP = "mx-auto w-full max-w-md flex-1 px-4 pb-12";

type Props = {
  children: ReactNode;
  // 위 여백(pt-6)을 둘지 정한다. 장소 상세는 맨 위가 "목록으로" 행이라 두지 않는다.
  top?: boolean;
};

export default function PageContainer({ children, top = true }: Props) {
  return <main className={top ? WITH_TOP : NO_TOP}>{children}</main>;
}
