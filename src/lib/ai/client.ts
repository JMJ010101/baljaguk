// OpenAI Responses API를 fetch로 호출한다. (SDK는 쓰지 않는다. 사용자 결정, 2026-10-31)
// 이 파일은 호출과 응답 모양 검사만 한다. 내용 검증은 parse.ts, 재시도는 picks.ts가 한다.
import "server-only";
import {
  AI_MAX_OUTPUT_TOKENS,
  AI_MODEL,
  AI_REASONING_EFFORT,
  AI_TIMEOUT_MS,
} from "@/lib/ai/constants";
import type { AiUsage, AiViolationKind } from "@/lib/ai/types";
import { AppError } from "@/lib/errors";

const API_URL = "https://api.openai.com/v1/responses";
const SCHEMA_NAME = "course_picks";
const HTTP_RATE_LIMITED = 429;

const MESSAGES = {
  API_TIMEOUT: "코스를 만드는 데 시간이 너무 오래 걸렸어요. 잠시 후 다시 시도해 주세요.",
  RATE_LIMIT: "지금은 코스 만들기 요청이 많아요. 잠시 후 다시 시도해 주세요.",
  API_FAILED: "코스를 만들지 못했어요. 잠시 후 다시 시도해 주세요.",
} as const;
const STATUS = { API_TIMEOUT: 504, RATE_LIMIT: 429, API_FAILED: 502 } as const;

export function aiError(code: keyof typeof MESSAGES): AppError {
  return new AppError(code, MESSAGES[code], STATUS[code]);
}

export type ModelCall =
  | { ok: true; text: string; usage: AiUsage; durationMs: number }
  | {
      ok: false;
      violation: Extract<AiViolationKind, "incomplete" | "refusal" | "unexpected_shape">;
      usage: AiUsage;
      durationMs: number;
    };

// 모델에게 요청할 JSON 스키마다. uniqueItems는 허용되지 않아서(측정으로 확인함) 넣지 않는다.
function buildSchema(pickCount: number) {
  return {
    type: "object",
    properties: {
      placeIds: { type: "array", items: { type: "integer" }, minItems: pickCount, maxItems: pickCount },
    },
    required: ["placeIds"],
    additionalProperties: false,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readNumber(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function readUsage(raw: unknown): AiUsage {
  const usage = isRecord(raw) ? raw : {};
  const details = isRecord(usage.output_tokens_details) ? usage.output_tokens_details : {};
  return {
    inputTokens: readNumber(usage.input_tokens),
    outputTokens: readNumber(usage.output_tokens),
    reasoningTokens: readNumber(details.reasoning_tokens),
  };
}

// 응답 모양을 보수적으로 검사한다. 예상 밖이면 모두 검증 실패다.
// 허용하는 모양: status가 completed이고, output에 reasoning 항목(0개 이상)과 message 항목(정확히 1개)만 있고,
// message의 content는 output_text 하나뿐이다. refusal, incomplete, 그 밖의 항목이나 필드 모양은 모두 실패로 본다.
function inspect(json: unknown, durationMs: number): ModelCall {
  const fail = (violation: "incomplete" | "refusal" | "unexpected_shape", usage: AiUsage): ModelCall => ({
    ok: false,
    violation,
    usage,
    durationMs,
  });
  if (!isRecord(json)) return fail("unexpected_shape", readUsage(undefined));
  const usage = readUsage(json.usage);

  if (json.status === "incomplete") return fail("incomplete", usage);
  if (json.status !== "completed") return fail("unexpected_shape", usage);
  if (json.error !== null && json.error !== undefined) return fail("unexpected_shape", usage);
  if (!Array.isArray(json.output)) return fail("unexpected_shape", usage);

  let text: string | undefined;
  let messageCount = 0;
  for (const item of json.output) {
    if (!isRecord(item)) return fail("unexpected_shape", usage);
    if (item.type === "reasoning") continue;
    if (item.type !== "message") return fail("unexpected_shape", usage);
    messageCount++;
    if (item.status === "incomplete") return fail("incomplete", usage);
    if (item.status !== undefined && item.status !== "completed") return fail("unexpected_shape", usage);
    if (!Array.isArray(item.content)) return fail("unexpected_shape", usage);
    for (const part of item.content) {
      if (!isRecord(part)) return fail("unexpected_shape", usage);
      if (part.type === "refusal") return fail("refusal", usage);
      if (part.type !== "output_text" || typeof part.text !== "string") return fail("unexpected_shape", usage);
      if (text !== undefined) return fail("unexpected_shape", usage);
      text = part.text;
    }
  }
  if (messageCount !== 1 || text === undefined || text.trim() === "") return fail("unexpected_shape", usage);
  return { ok: true, text, usage, durationMs };
}

function isTimeout(e: unknown): boolean {
  return e instanceof Error && (e.name === "TimeoutError" || e.name === "AbortError");
}

// 전송 오류는 AppError로 던지고(타임아웃 504, 한도 초과 429, 그 밖 502), 응답이 규칙을 어긴 경우는 던지지 않고 돌려준다.
// 오류 객체에는 요청 정보가 들어 있을 수 있어 메시지를 쓰지 않는다. 사용자 입력과 키는 로그에 남기지 않는다.
export async function callCourseModel(params: {
  instructions: string;
  input: string;
  pickCount: number;
  timeoutMs?: number;
}): Promise<ModelCall> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw aiError("API_FAILED");

  const body = {
    model: AI_MODEL,
    instructions: params.instructions,
    input: params.input,
    reasoning: { effort: AI_REASONING_EFFORT },
    max_output_tokens: AI_MAX_OUTPUT_TOKENS,
    store: false,
    text: { format: { type: "json_schema", name: SCHEMA_NAME, strict: true, schema: buildSchema(params.pickCount) } },
  };

  const startedAt = Date.now();
  let res: Response;
  let raw: unknown;
  try {
    res = await fetch(API_URL, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${apiKey}` },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(params.timeoutMs ?? AI_TIMEOUT_MS),
    });
    if (res.ok) {
      try {
        raw = await res.json();
      } catch (e) {
        if (isTimeout(e)) throw e;
        raw = undefined; // 200인데 JSON이 아님 → 아래 inspect에서 예상 밖 모양으로 처리
      }
    }
  } catch (e) {
    throw aiError(isTimeout(e) ? "API_TIMEOUT" : "API_FAILED");
  }

  if (res.status === HTTP_RATE_LIMITED) throw aiError("RATE_LIMIT");
  if (!res.ok) {
    console.error(`OpenAI 호출 실패: HTTP ${res.status}`);
    throw aiError("API_FAILED");
  }
  return inspect(raw, Date.now() - startedAt);
}
