import Button from "@/components/Button";
import RefreshButton from "@/components/RefreshButton";
import StatusScreen from "@/components/StatusScreen";

// 장소 상세의 오류 상태 화면이다. 존재하지 않는 장소는 여기서 다루지 않고 not-found.tsx로 보낸다.
// 문구는 DESIGN.md의 "세부 문구 확정"이 정해지기 전의 초안이다. 에러 코드와 원본 메시지는 화면에 보이지 않는다.
const warningIcon = (
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
);

export default function PlaceDetailStatus({ code, backHref }: { code: string; backHref: string }) {
  if (code === "RATE_LIMIT") {
    return (
      <StatusScreen
        icon={warningIcon}
        title="조회 가능 횟수를 넘었어요"
        description="오늘 장소 조회 가능 횟수를 넘었어요. 내일 다시 시도해 주세요."
      >
        <Button href={backHref}>목록으로</Button>
      </StatusScreen>
    );
  }

  const isDb = code === "DB_UNAVAILABLE";
  return (
    <StatusScreen
      icon={warningIcon}
      title={isDb ? "데이터를 불러오지 못했어요" : "장소 정보를 불러오지 못했어요"}
      description={
        isDb ? "잠시 후 다시 시도해 주세요. 계속되면 목록으로 돌아가 주세요." : "잠시 후 다시 시도해 주세요."
      }
    >
      <RefreshButton>다시 시도</RefreshButton>
      <Button href={backHref} variant="secondary">
        목록으로
      </Button>
    </StatusScreen>
  );
}
