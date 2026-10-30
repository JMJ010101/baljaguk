// IP 읽기와 해시를 고정하는 단위 테스트다. 외부 호출은 0번이다.
// 실행: npx -y tsx@4.23.12 --conditions=react-server --test src/lib/clientIp.test.ts
import assert from "node:assert/strict";
import { test } from "node:test";
import { getClientIpHash, hashIp, readClientIp } from "@/lib/clientIp";
import { AppError } from "@/lib/errors";

const request = (headers: Record<string, string>) => new Request("https://example.com/api/course", { method: "POST", headers });

test("x-vercel-forwarded-for가 있으면 그것을 먼저 쓴다", () => {
  const headers = new Headers({ "x-vercel-forwarded-for": "1.1.1.1", "x-forwarded-for": "2.2.2.2" });
  assert.equal(readClientIp(headers), "1.1.1.1");
});

test("없으면 x-forwarded-for를 쓰고, 쉼표로 이어진 값은 첫 항목만 쓴다", () => {
  assert.equal(readClientIp(new Headers({ "x-forwarded-for": "3.3.3.3, 4.4.4.4" })), "3.3.3.3");
});

test("헤더가 없거나 비어 있으면 unknown", () => {
  assert.equal(readClientIp(new Headers()), "unknown");
  assert.equal(readClientIp(new Headers({ "x-forwarded-for": "  " })), "unknown");
});

test("해시는 같은 입력이면 같고, 소금이나 IP가 다르면 다르며, 원본 IP를 담지 않는다", () => {
  const a = hashIp("1.1.1.1", "salt-a");
  assert.equal(a, hashIp("1.1.1.1", "salt-a"));
  assert.notEqual(a, hashIp("1.1.1.1", "salt-b"));
  assert.notEqual(a, hashIp("1.1.1.2", "salt-a"));
  assert.match(a, /^[0-9a-f]{64}$/);
  assert.ok(!a.includes("1.1.1.1"));
});

test("소금 환경변수가 없으면 해시를 만들지 않고 API_FAILED 500으로 실패한다", () => {
  const saved = process.env.RATE_LIMIT_SALT;
  delete process.env.RATE_LIMIT_SALT;
  try {
    assert.throws(
      () => getClientIpHash(request({ "x-forwarded-for": "1.1.1.1" })),
      (e: unknown) => e instanceof AppError && e.code === "API_FAILED" && e.status === 500,
    );
  } finally {
    if (saved !== undefined) process.env.RATE_LIMIT_SALT = saved;
  }
});

test("소금이 있으면 요청 헤더의 IP로 해시를 만든다", () => {
  const saved = process.env.RATE_LIMIT_SALT;
  process.env.RATE_LIMIT_SALT = "test-salt";
  try {
    assert.equal(getClientIpHash(request({ "x-forwarded-for": "1.1.1.1" })), hashIp("1.1.1.1", "test-salt"));
  } finally {
    if (saved === undefined) delete process.env.RATE_LIMIT_SALT;
    else process.env.RATE_LIMIT_SALT = saved;
  }
});
