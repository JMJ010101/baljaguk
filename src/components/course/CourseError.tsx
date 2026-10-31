import Button from "@/components/Button";
import StatusScreen from "@/components/StatusScreen";
import type { ErrorScreenKind } from "@/lib/course/errorScreen";

// 코스 생성 오류 화면 6종이다. 문구는 DESIGN.md의 "세부 문구 확정"이 정해지기 전의 초안이다.
// 코드와 원본 메시지는 보이지 않는다. 서버 문구(message)는 호출 한도 초과와 조건 부족에서만 쓴다.
// TODO(확인 필요): 시간 초과 뒤 "다시 시도"를 누르면 코스가 중복으로 만들어지고 호출 한도를 한 번 더 쓸 수 있다.
// 클라이언트가 기다리다 끊은 뒤 서버가 저장을 끝냈는지는 알 수 없고, 그 확인 방법은 아직 없다.
const FALLBACK_DESCRIPTION = "잠시 후 다시 시도해 주세요.";

type ScreenText = { title: string; description: string };

const TEXTS: Record<ErrorScreenKind, ScreenText> = {
  "rate-limit": { title: "코스 만들기 가능 횟수를 넘었어요", description: FALLBACK_DESCRIPTION },
  timeout: {
    title: "시간이 오래 걸렸어요",
    description: "코스를 만드는 데 시간이 너무 오래 걸렸어요. 잠시 후 다시 시도해 주세요.",
  },
  "api-failed": { title: "장소 정보를 불러오지 못했어요", description: FALLBACK_DESCRIPTION },
  "course-failed": {
    title: "코스를 만들지 못했어요",
    description: "잠시 후 다시 시도해 주세요. 계속되면 지역이나 유형을 바꿔 보세요.",
  },
  insufficient: {
    title: "조건에 맞는 장소가 부족해요",
    description: "지역을 넓히거나 유형을 바꿔 보세요.",
  },
  "db-unavailable": {
    title: "데이터를 불러오지 못했어요",
    description: "잠시 후 다시 시도해 주세요. 계속되면 처음으로 돌아가 주세요.",
  },
};

const SERVER_MESSAGE_SCREENS: readonly ErrorScreenKind[] = ["rate-limit", "insufficient"];

type Props = {
  screen: ErrorScreenKind;
  message?: string;
  onRetry: () => void;
  onEdit: () => void;
};

export default function CourseError({ screen, message, onRetry, onEdit }: Props) {
  const text = TEXTS[screen];
  const description = SERVER_MESSAGE_SCREENS.includes(screen) && message !== undefined ? message : text.description;

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
      title={text.title}
      description={description}
    >
      {screen === "rate-limit" && <Button href="/">처음으로</Button>}
      {screen === "insufficient" && <Button onClick={onEdit}>조건 바꾸기</Button>}
      {screen !== "rate-limit" && screen !== "insufficient" && <Button onClick={onRetry}>다시 시도</Button>}
    </StatusScreen>
  );
}
