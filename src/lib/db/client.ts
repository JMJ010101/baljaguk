// 서버 전용 Supabase 클라이언트. secret 키는 RLS를 건너뛰므로 브라우저로 나가면 안 된다.
// 옵션 없이 만든다. 공식 문서의 서버 예시가 URL과 키만 전달하며, auth 옵션 권장은 확인하지 못했다.
import "server-only";
import { createClient } from "@supabase/supabase-js";
import { DB_UNAVAILABLE_MESSAGE, DB_UNAVAILABLE_STATUS } from "@/lib/db/errors";
import { AppError } from "@/lib/errors";

// timeoutMs를 주면 그 값을 타임아웃으로 쓴다. 호출하는 쪽이 전체 예산에서 남은 시간으로 줄여서 넘긴다. 없으면 DB_TIMEOUT_MS다.
export type DbCallOptions = { timeoutMs?: number };

// DB 쿼리마다 .abortSignal(AbortSignal.timeout(DB_TIMEOUT_MS))를 건다. (Supabase 공식 문서의 abortSignal)
// 타임아웃은 예외가 아니라 { data: null, error }로 돌아와서 각 쿼리의 기존 오류 처리가 DB_UNAVAILABLE로 바꾼다. (select, maybeSingle, upsert로 확인함)
// abortSignal은 maybeSingle() 앞에 붙인다. 뒤에 붙이면 런타임은 되지만 타입 정의가 허용하지 않는다.
// 첫 연결에 1.4초가 걸린 적이 있어(측정) 5초로 둔다. 중단된 쓰기가 서버에 반영되는지는 1ms 중단에서만 확인했다.
export const DB_TIMEOUT_MS = 5000;

export function createDbClient() {
  const url = process.env.SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET_KEY;
  if (!url || !secretKey) {
    throw new AppError("DB_UNAVAILABLE", DB_UNAVAILABLE_MESSAGE, DB_UNAVAILABLE_STATUS);
  }
  return createClient(url, secretKey);
}
