// courses 읽기/쓰기. DB 접근은 이 파일의 함수로만 한다. 오류는 DB_UNAVAILABLE로 바꿔서 던진다. (CLAUDE.md)
import "server-only";
import { z } from "zod";
import type { PublicCourse } from "@/lib/course/types";
import { createDbClient, DB_TIMEOUT_MS } from "@/lib/db/client";
import { dbUnavailableError, isDbTimeoutError } from "@/lib/db/errors";
import { stepTimeoutMs } from "@/lib/deadline";

const TABLE_NAME = "courses";

const missingTypeSchema = z.object({
  contentTypeId: z.number().int(),
  reason: z.enum(["no-data", "out-of-range"]),
});

// 저장되는 input이다. mood(사용자가 쓴 분위기)가 들어 있어서 이 스키마는 이 파일 안에서만 쓴다. 화면에는 PublicCourse만 준다.
const inputSchema = z.object({
  sido: z.string(),
  sigungu: z.string().optional(),
  types: z.array(z.number().int()),
  mood: z.string().optional(),
  persona: z.object({ id: z.string(), profile: z.record(z.string(), z.unknown()) }),
  anchorPlaceId: z.number().int(),
  radiusMeters: z.number(),
  missingTypes: z.array(missingTypeSchema),
});

const resultSchema = z.object({ placeIds: z.array(z.number().int().positive()) });

const rowSchema = z.object({
  id: z.uuid(),
  input: inputSchema,
  result: resultSchema,
  prompt_version: z.string(),
  created_at: z.string(),
});

// 서버에서만 쓰는 저장용 타입이다. mood가 들어 있어서 화면 코드는 이 타입을 쓰지 않는다.
export type CourseInputSnapshot = z.infer<typeof inputSchema>;

export type NewCourse = {
  // 서버에서 만든 uuid
  id: string;
  input: CourseInputSnapshot;
  placeIds: number[];
  promptVersion: string;
};

// 한 번만 쓴다. 재시도하지 않는다.
// 쓰기가 타임아웃으로 중단되면 서버에 반영됐는지 알 수 없다. id를 알고 있으므로 읽기 한 번으로 확인한다. (삽입을 다시 하지 않는다)
// 확인 읽기를 위한 시간을 마감에서 미리 빼고 쓰기의 타임아웃을 정한다.
export async function createCourse(course: NewCourse, options?: { deadlineAt?: number }): Promise<void> {
  const db = createDbClient();
  const row = {
    id: course.id,
    input: course.input,
    result: { placeIds: course.placeIds },
    prompt_version: course.promptVersion,
  };

  const writeMs = stepTimeoutMs(DB_TIMEOUT_MS, options?.deadlineAt, DB_TIMEOUT_MS);
  const written = await db.from(TABLE_NAME).insert(row).abortSignal(AbortSignal.timeout(writeMs));
  if (!written.error) return;
  if (!isDbTimeoutError(written)) throw dbUnavailableError(written.error, TABLE_NAME);

  let confirmMs: number;
  try {
    confirmMs = stepTimeoutMs(DB_TIMEOUT_MS, options?.deadlineAt);
  } catch {
    throw dbUnavailableError(written.error, TABLE_NAME);
  }
  const confirmed = await db
    .from(TABLE_NAME)
    .select("id")
    .eq("id", course.id)
    .limit(1)
    .abortSignal(AbortSignal.timeout(confirmMs));
  if (!confirmed.error && confirmed.data !== null && confirmed.data.length > 0) {
    console.warn(`courses 쓰기가 타임아웃됐지만 저장되어 있음: id=${course.id}`);
    return;
  }
  throw dbUnavailableError(confirmed.error ?? written.error, TABLE_NAME);
}

// 공개용 코스를 읽는다. mood와 내부 정보는 돌려주지 않는다. 필드를 하나씩 골라 담아서 저장된 객체를 그대로 펼치지 않는다.
// uuid 형식이 아니거나, 행이 없거나, 저장된 모양이 맞지 않으면 null이다.
export async function getCourse(id: string): Promise<PublicCourse | null> {
  if (!z.uuid().safeParse(id).success) return null;

  const { data, error } = await createDbClient()
    .from(TABLE_NAME)
    .select("id, input, result, prompt_version, created_at")
    .eq("id", id)
    .limit(1)
    .abortSignal(AbortSignal.timeout(DB_TIMEOUT_MS));
  if (error) throw dbUnavailableError(error, TABLE_NAME);

  const row = data?.[0];
  if (row === undefined) return null;
  const parsed = rowSchema.safeParse(row);
  if (!parsed.success) {
    console.warn(`courses 검증 실패로 없음 처리: id=${id}`);
    return null;
  }

  const { input, result } = parsed.data;
  return {
    id: parsed.data.id,
    createdAt: parsed.data.created_at,
    sido: input.sido,
    sigungu: input.sigungu,
    types: input.types,
    missingTypes: input.missingTypes,
    placeIds: result.placeIds,
  };
}
