export default function VisitCheckNotice() {
  return (
    <div
      role="note"
      className="flex items-center gap-2 rounded-button bg-notice px-3 py-2 text-sm font-medium text-foreground"
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
