// 코스 생성 중 보여 주는 진행 안내 문구다. 경과 시간 구간별 문구이고, 실제 서버 단계(후보, AI, 확인, 저장)와 연결하지 않는다.
// 숫자 소요 시간은 문구에 쓰지 않는다. 구간이 바뀌는 시각은 constants.ts의 임시값이다.
// 클라이언트에서도 쓸 수 있어서 server-only 파일을 import하지 않는다.
import { PROGRESS_STAGE_START_MS } from "@/lib/course/constants";

export const PROGRESS_MESSAGES: readonly string[] = [
  "코스를 만들고 있어요.",
  "조건에 맞는 장소를 고르고 있어요. 조금만 기다려 주세요.",
  "평소보다 조금 걸리고 있어요.",
  "오래 걸리고 있어요. 조금만 더 기다려 주세요.",
];

// 경과 시간이 속한 구간의 문구다. 마지막 구간을 넘으면 마지막 문구를 유지한다.
export function progressMessage(elapsedMs: number): string {
  let index = 0;
  PROGRESS_STAGE_START_MS.forEach((startMs, i) => {
    if (elapsedMs >= startMs) index = i;
  });
  return PROGRESS_MESSAGES[index];
}
