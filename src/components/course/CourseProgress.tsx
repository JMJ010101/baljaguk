"use client";

import { useEffect, useState } from "react";
import StatusScreen from "@/components/StatusScreen";
import { progressMessage } from "@/lib/course/progress";

const TICK_MS = 1000;

// 코스 생성 중 화면이다. 경과 시간에 따라 문구만 바뀌고, 퍼센트와 남은 시간은 보여 주지 않는다. (실제로 알 수 없다)
// 기다리면 끝나는 상태라 다음 행동 버튼이 없다. (DESIGN.md의 로딩 예외)
export default function CourseProgress() {
  const [elapsedMs, setElapsedMs] = useState(0);

  useEffect(() => {
    const startedAt = Date.now();
    const timer = setInterval(() => setElapsedMs(Date.now() - startedAt), TICK_MS);
    return () => clearInterval(timer);
  }, []);

  return (
    <div role="status" className="flex flex-1 flex-col">
      <StatusScreen
        icon={
          <svg
            viewBox="0 0 24 24"
            width="40"
            height="40"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="9" />
            <path d="M12 7v5l3 2" />
          </svg>
        }
        title="코스를 만들고 있어요"
        description={progressMessage(elapsedMs)}
      />
    </div>
  );
}
