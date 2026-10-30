// usage_log 읽기/쓰기. DB 접근은 이 파일의 함수로만 한다. 오류는 DB_UNAVAILABLE로 바꿔서 던진다. (CLAUDE.md)
// 한도를 판단하는 규칙은 lib/rateLimit.ts에 있고, 이 파일은 개수 세기와 기록만 한다.
import "server-only";
import { createDbClient, DB_TIMEOUT_MS, type DbCallOptions } from "@/lib/db/client";
import { dbUnavailableError } from "@/lib/db/errors";

const TABLE_NAME = "usage_log";

export type UsageCountQuery = {
  endpoint: string;
  // 없으면 endpoint 전체(모든 IP)를 센다.
  ipHash?: string;
  // 이 시각 이후의 기록만 센다. (ISO 문자열이 아니라 밀리초 시각)
  sinceMs: number;
};

export async function countUsage(query: UsageCountQuery, options?: DbCallOptions): Promise<number> {
  let request = createDbClient()
    .from(TABLE_NAME)
    .select("id", { count: "exact", head: true })
    .eq("endpoint", query.endpoint)
    .gte("created_at", new Date(query.sinceMs).toISOString());
  if (query.ipHash !== undefined) request = request.eq("ip_hash", query.ipHash);

  const { count, error } = await request.abortSignal(AbortSignal.timeout(options?.timeoutMs ?? DB_TIMEOUT_MS));
  if (error) throw dbUnavailableError(error, TABLE_NAME);
  if (count === null) throw dbUnavailableError({ message: "count가 비어 있음" }, TABLE_NAME);
  return count;
}

// 기록은 한 번만 한다. 재시도하지 않는다. 타임아웃이면 기록됐는지 알 수 없지만 호출하는 쪽이 요청을 막는다(fail closed).
export async function recordUsage(entry: { endpoint: string; ipHash: string }, options?: DbCallOptions): Promise<void> {
  const { error } = await createDbClient()
    .from(TABLE_NAME)
    .insert({ endpoint: entry.endpoint, ip_hash: entry.ipHash })
    .abortSignal(AbortSignal.timeout(options?.timeoutMs ?? DB_TIMEOUT_MS));
  if (error) throw dbUnavailableError(error, TABLE_NAME);
}
