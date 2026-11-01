import Button from "@/components/Button";
import StatusScreen from "@/components/StatusScreen";

// getCourse가 null을 준 경우다. (uuid가 아님, 행 없음, 저장된 모양 불일치) 원인을 구분하지 못하므로 원인을 단정하지 않는다.
export default function CourseNotFound() {
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
      title="코스를 찾을 수 없어요"
      description="링크가 올바른지 확인해 주세요. 새 코스를 만들 수도 있어요."
    >
      <Button href="/course/new">코스 만들기</Button>
    </StatusScreen>
  );
}
