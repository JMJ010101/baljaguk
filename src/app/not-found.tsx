import Button from "@/components/Button";
import StatusScreen from "@/components/StatusScreen";

export default function NotFound() {
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
          <circle cx="12" cy="12" r="10" />
          <path d="M9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3" />
          <path d="M12 17h.01" />
        </svg>
      }
      title="찾을 수 없는 링크예요"
      description="주소가 바뀌었거나 없어진 페이지일 수 있어요."
    >
      <Button href="/">처음으로</Button>
      <Button href="/places" variant="secondary">
        장소 둘러보기
      </Button>
    </StatusScreen>
  );
}
