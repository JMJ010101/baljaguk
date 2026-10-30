// AI 호출에 쓰는 값은 모두 이 파일 한 곳에 둔다. 모델명도 여기서만 정의한다. (CLAUDE.md)
// 프롬프트 버전을 비교할 때는 같은 모델, 같은 추론 강도로 비교한다.

export const AI_MODEL = "gpt-6-luna";
// 추론 강도. 측정에서 low와 medium의 검증 통과율이 같았고 low가 더 빠르고 저렴했다. (2026-10-31, 13번 호출)
export const AI_REASONING_EFFORT = "low";
// 추론 토큰과 보이는 출력의 합 상한이다. 관찰된 최댓값 825(추론 787)의 약 5배다.
export const AI_MAX_OUTPUT_TOKENS = 4000;
// 호출 하나의 타임아웃. 측정된 최대 소요 시간은 10.7초였다.
export const AI_TIMEOUT_MS = 20_000;
// 검증 실패 시 다시 호출하는 횟수다. 총 호출은 이 값 + 1번이다. (CLAUDE.md: 최대 1회)
export const AI_RETRY_LIMIT = 1;
// 사용자 분위기 입력의 최대 길이(글자 수)
export const MOOD_MAX_LENGTH = 100;
