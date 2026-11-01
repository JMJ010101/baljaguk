import Button from "@/components/Button";
import RefreshButton from "@/components/RefreshButton";
import StatusScreen from "@/components/StatusScreen";

// 코스 결과 화면의 오류 상태다. 존재하지 않는 코스는 여기서 다루지 않고 not-found.tsx로 보낸다.
// 문구는 DESIGN.md의 "세부 문구 확정"이 정해지기 전의 초안이다. 서버 문구는 호출 한도 초과 화면에서만 쓴다. 에러 코드는 보이지 않는다.
export type CourseStatusKind = "db" | "failed" | "rate-limit";

const FALLBACK_RATE_LIMIT_DESCRIPTION = "잠시 후 다시 시도해 주세요.";

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

export default function CourseStatus({ kind, message }: { kind: CourseStatusKind; message?: string }) {
  if (kind === "rate-limit") {
    return (
      <StatusScreen icon={warningIcon} title="조회 가능 횟수를 넘었어요" description={message ?? FALLBACK_RATE_LIMIT_DESCRIPTION}>
        <Button href="/">처음으로</Button>
      </StatusScreen>
    );
  }

  const isDb = kind === "db";
  return (
    <StatusScreen
      icon={warningIcon}
      title={isDb ? "데이터를 불러오지 못했어요" : "코스 장소를 불러오지 못했어요"}
      description={isDb ? "잠시 후 다시 시도해 주세요. 계속되면 처음으로 돌아가 주세요." : "잠시 후 다시 시도해 주세요."}
    >
      <RefreshButton>다시 시도</RefreshButton>
      <Button href="/" variant="secondary">
        처음으로
      </Button>
    </StatusScreen>
  );
}
