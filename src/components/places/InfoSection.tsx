import type { ReactNode } from "react";
import VisitCheckNotice from "@/components/VisitCheckNotice";

// 제목과 카드로 된 정보 구역이다. 동반 조건이나 운영시간을 보여주는 구역에는 "방문 전 확인 필요"가 항상 따라온다.
// 보여줄 값이 없는 구역(안내 문구만 있는 경우)에서는 showNotice를 끈다.
export default function InfoSection({
  title,
  showNotice = true,
  children,
}: {
  title: string;
  showNotice?: boolean;
  children: ReactNode;
}) {
  return (
    <section className="mt-8">
      <h2 className="text-xl font-bold">{title}</h2>
      <div className="mt-3 flex flex-col gap-4 rounded-card bg-surface p-4 shadow-card">
        {children}
        {showNotice && <VisitCheckNotice />}
      </div>
    </section>
  );
}
