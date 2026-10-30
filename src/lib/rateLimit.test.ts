// enforceRateLimit의 판단 순서를 고정하는 단위 테스트다. DB는 가짜로 바꿔 끼우므로 외부 호출은 0번이다.
// 실행: npx -y tsx@4.23.12 --conditions=react-server --test src/lib/rateLimit.test.ts
import assert from "node:assert/strict";
import { test } from "node:test";
import { AppError } from "@/lib/errors";
import { enforceRateLimit, type RateLimitDeps, type RateLimitPolicy } from "@/lib/rateLimit";

const NOW = 1_700_000_000_000;
const HOUR = 3_600_000;
const DAY = 24 * HOUR;
const policy: RateLimitPolicy = {
  endpoint: "test",
  perIp: { limit: 5, windowMs: HOUR },
  global: { limit: 20, windowMs: DAY },
};

function fakeDeps(counts: { ip: number; global: number }, failOn?: "count" | "record") {
  const log = { counts: [] as unknown[], records: [] as unknown[] };
  const deps: RateLimitDeps = {
    now: () => NOW,
    countUsage: async (query, options) => {
      log.counts.push({ query, options });
      if (failOn === "count") throw new AppError("DB_UNAVAILABLE", "x", 503);
      return query.ipHash === undefined ? counts.global : counts.ip;
    },
    recordUsage: async (entry) => {
      log.records.push(entry);
      if (failOn === "record") throw new AppError("DB_UNAVAILABLE", "x", 503);
    },
  };
  return { deps, log };
}

async function codeOf(promise: Promise<unknown>): Promise<string> {
  try {
    await promise;
    return "no-error";
  } catch (e) {
    return e instanceof AppError ? `${e.code}/${e.status}` : `예상 밖 오류: ${String(e)}`;
  }
}

test("한도 미만이면 통과하고 기록을 한 번만 한다", async () => {
  const { deps, log } = fakeDeps({ ip: 4, global: 19 });
  await enforceRateLimit({ ipHash: "h", policy }, deps);
  assert.deepEqual(log.records, [{ endpoint: "test", ipHash: "h" }]);
});

test("IP별 개수와 전체 개수를 각각 센다. 기간은 정책의 windowMs를 쓴다", async () => {
  const { deps, log } = fakeDeps({ ip: 0, global: 0 });
  await enforceRateLimit({ ipHash: "h", policy }, deps);
  const queries = (log.counts as { query: { ipHash?: string; sinceMs: number; endpoint: string } }[]).map((c) => c.query);
  assert.equal(queries.length, 2);
  assert.deepEqual(queries.find((q) => q.ipHash === "h"), { endpoint: "test", ipHash: "h", sinceMs: NOW - HOUR });
  assert.deepEqual(queries.find((q) => q.ipHash === undefined), { endpoint: "test", sinceMs: NOW - DAY });
});

test("IP 개수가 한도에 닿으면 RATE_LIMIT 429이고 기록하지 않는다", async () => {
  const { deps, log } = fakeDeps({ ip: 5, global: 0 });
  assert.equal(await codeOf(enforceRateLimit({ ipHash: "h", policy }, deps)), "RATE_LIMIT/429");
  assert.equal(log.records.length, 0);
});

test("전체 개수가 한도에 닿으면 RATE_LIMIT 429이고 기록하지 않는다", async () => {
  const { deps, log } = fakeDeps({ ip: 0, global: 20 });
  assert.equal(await codeOf(enforceRateLimit({ ipHash: "h", policy }, deps)), "RATE_LIMIT/429");
  assert.equal(log.records.length, 0);
});

test("한도 인자가 0이면 개수가 0이어도 항상 거절하고 기록하지 않는다", async () => {
  const { deps, log } = fakeDeps({ ip: 0, global: 0 });
  const zero: RateLimitPolicy = { endpoint: "test", perIp: { limit: 0, windowMs: HOUR } };
  assert.equal(await codeOf(enforceRateLimit({ ipHash: "h", policy: zero }, deps)), "RATE_LIMIT/429");
  assert.equal(log.records.length, 0);
  const zeroGlobal: RateLimitPolicy = { ...policy, global: { limit: 0, windowMs: DAY } };
  assert.equal(await codeOf(enforceRateLimit({ ipHash: "h", policy: zeroGlobal }, deps)), "RATE_LIMIT/429");
  assert.equal(log.records.length, 0);
});

test("전체 한도가 없는 정책은 IP 개수만 센다", async () => {
  const { deps, log } = fakeDeps({ ip: 0, global: 999 });
  await enforceRateLimit({ ipHash: "h", policy: { endpoint: "test", perIp: policy.perIp } }, deps);
  assert.equal(log.counts.length, 1);
  assert.equal(log.records.length, 1);
});

test("개수 조회가 DB 오류면 통과시키지 않고(fail closed) DB_UNAVAILABLE이며 기록하지 않는다", async () => {
  const { deps, log } = fakeDeps({ ip: 0, global: 0 }, "count");
  assert.equal(await codeOf(enforceRateLimit({ ipHash: "h", policy }, deps)), "DB_UNAVAILABLE/503");
  assert.equal(log.records.length, 0);
});

test("기록이 DB 오류면 요청을 통과시키지 않는다(fail closed)", async () => {
  const { deps } = fakeDeps({ ip: 0, global: 0 }, "record");
  assert.equal(await codeOf(enforceRateLimit({ ipHash: "h", policy }, deps)), "DB_UNAVAILABLE/503");
});

test("남은 예산이 DB 타임아웃보다 작으면 그 값으로 줄여서 호출하고, 예산이 없으면 API_TIMEOUT이다", async () => {
  const { deps, log } = fakeDeps({ ip: 0, global: 0 });
  await enforceRateLimit({ ipHash: "h", policy, deadlineAt: Date.now() + 1500 }, deps);
  const timeouts = (log.counts as { options: { timeoutMs: number } }[]).map((c) => c.options.timeoutMs);
  assert.ok(timeouts.every((ms) => ms <= 1500 && ms > 0));
  const expired = fakeDeps({ ip: 0, global: 0 });
  assert.equal(await codeOf(enforceRateLimit({ ipHash: "h", policy, deadlineAt: Date.now() - 1 }, expired.deps)), "API_TIMEOUT/504");
  assert.equal(expired.log.counts.length, 0);
});
