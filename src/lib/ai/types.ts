import type { CourseCandidate } from "@/lib/course/types";

// 모델 응답이 규칙을 어긴 종류다. 재시도 때 모델에게 알리고, 서버 로그에는 이 이름만 남긴다.
export type AiViolationKind =
  | "incomplete" // 응답이 끝나지 않음(max_output_tokens 등)
  | "refusal" // 모델이 거절함
  | "unexpected_shape" // 응답의 status나 output 모양이 예상과 다름
  | "invalid_json" // 본문이 JSON이 아님
  | "bad_output" // JSON이지만 { placeIds: 정수 목록 } 모양이 아님
  | "unknown_id" // 후보에 없는 placeId
  | "duplicate_id" // 중복된 placeId
  | "wrong_count" // 요청한 장소 수와 다름
  | "missing_type"; // 후보에 있는 선택 유형이 빠짐

export type AiUsage = { inputTokens: number; outputTokens: number; reasoningTokens: number };

export type CoursePromptInput = {
  regionName: string;
  selectedTypeIds: number[];
  // 사용자가 직접 쓴 분위기. 데이터로만 넣고 지시로 따르지 않는다.
  mood?: string;
  // 페르소나의 soft 힌트
  softHints: string[];
  requestedCount: number;
  minCount: number;
  candidates: CourseCandidate[];
};

// 프롬프트 한 버전이다. 문자열은 lib/ai/prompts/ 안에서만 만든다. (CLAUDE.md)
export type PromptVersion = {
  version: string;
  build(input: CoursePromptInput, violations?: AiViolationKind[]): { instructions: string; input: string };
};
