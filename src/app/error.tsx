"use client";

import Button from "@/components/Button";
import StatusScreen from "@/components/StatusScreen";

// 원본 에러 내용은 화면에 보여주지 않는다.
export default function Error({ reset }: { reset: () => void }) {
  return (
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
          <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" />
          <path d="M12 9v4" />
          <path d="M12 17h.01" />
        </svg>
      }
      title="잠시 문제가 생겼어요"
      description="잠시 후 다시 시도해 주세요. 계속되면 처음으로 돌아가 주세요."
    >
      <Button onClick={reset}>다시 시도</Button>
      <Button href="/" variant="secondary">
        처음으로
      </Button>
    </StatusScreen>
  );
}
