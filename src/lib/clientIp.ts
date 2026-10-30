// 요청에서 클라이언트 IP를 읽어 해시한다. 호출 한도(rateLimit)의 키로만 쓰고, IP 원본은 저장하거나 로그에 남기지 않는다.
// Vercel 공식 문서(Request headers, 2025-12-13 갱신): x-forwarded-for는 요청한 클라이언트의 공개 IP이고, 외부에서 넣은 값은
// 스푸핑 방지를 위해 덮어쓴다. x-vercel-forwarded-for는 같은 값이지만 앞단에 프록시를 두면 x-forwarded-for만 덮어써질 수 있다.
// 문서 기준이고 배포 후 실제 값은 확인하지 못했다. (TODO 확인 필요: 배포 후)
import "server-only";
import { createHmac } from "node:crypto";
import { AppError } from "@/lib/errors";

const SALT_ENV_NAME = "RATE_LIMIT_SALT";
const IP_HEADERS = ["x-vercel-forwarded-for", "x-forwarded-for"] as const;
// 헤더가 없을 때(로컬 개발 등)의 대체 값이다. 모두 한 통에 모여서 가장 보수적으로 막힌다.
const UNKNOWN_IP = "unknown";
const CONFIG_ERROR_MESSAGE = "문제가 생겼어요. 잠시 후 다시 시도해 주세요.";
const CONFIG_ERROR_STATUS = 500;

// 쉼표로 이어진 값이면 첫 항목만 쓴다.
export function readClientIp(headers: Headers): string {
  for (const name of IP_HEADERS) {
    const first = headers.get(name)?.split(",")[0]?.trim();
    if (first) return first;
  }
  return UNKNOWN_IP;
}

export function hashIp(ip: string, salt: string): string {
  return createHmac("sha256", salt).update(ip).digest("hex");
}

// 소금이 없으면 해시를 만들 수 없다. 요청을 통과시키지 않고 실패시킨다. (별도 에러 코드는 만들지 않는다)
// route는 request.headers를, 서버 컴포넌트(page)는 next/headers의 headers()를 넘긴다.
export function getClientIpHash(headers: Headers): string {
  const salt = process.env[SALT_ENV_NAME];
  if (!salt) {
    console.error(`${SALT_ENV_NAME}가 설정되어 있지 않음`);
    throw new AppError("API_FAILED", CONFIG_ERROR_MESSAGE, CONFIG_ERROR_STATUS);
  }
  return hashIp(readClientIp(headers), salt);
}
