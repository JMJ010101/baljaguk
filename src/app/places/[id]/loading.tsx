import StatusScreen from "@/components/StatusScreen";

// 로딩은 기다리면 끝나는 상태라 다음 행동 버튼이 없다. (DESIGN.md의 예외)
export default function Loading() {
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
        title="장소 정보를 불러오고 있어요"
        description="잠시만 기다려 주세요."
      />
    </div>
  );
}
