const NOTICE = "flex items-center justify-center gap-2 rounded-button bg-notice px-3 py-2 text-sm font-medium text-foreground";
// 호버에서 살짝 커진다. 움직임은 "동작 줄이기"에서 빠진다.
const NOTICE_HOVER = "motion-safe:transition-[scale] motion-safe:duration-150 motion-safe:hover:scale-[1.03]";

// hover는 호버 효과를 켤지 정한다. 기본은 켜짐이다. 코스 결과의 카드 안에서는 false로 둔다.
export default function VisitCheckNotice({ hover = true }: { hover?: boolean }) {
  return (
    <div
      role="note"
      className={hover ? `${NOTICE} ${NOTICE_HOVER}` : NOTICE}
    >
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        width="16"
        height="16"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="shrink-0"
      >
        <circle cx="12" cy="12" r="10" />
        <path d="M12 8v5" />
        <path d="M12 16.5h.01" />
      </svg>
      <span>방문 전 확인 필요</span>
    </div>
  );
}
