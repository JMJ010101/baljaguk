// 서버 전용 Supabase 클라이언트. secret 키는 RLS를 건너뛰므로 브라우저로 나가면 안 된다.
// 옵션 없이 만든다. 공식 문서의 서버 예시가 URL과 키만 전달하며, auth 옵션 권장은 확인하지 못했다.
import "server-only";
import { createClient } from "@supabase/supabase-js";
import { AppError } from "@/lib/errors";

const DB_UNAVAILABLE_MESSAGE = "데이터를 불러오지 못했어요. 잠시 후 다시 시도해 주세요.";
const DB_UNAVAILABLE_STATUS = 503;

export function createDbClient() {
  const url = process.env.SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET_KEY;
  if (!url || !secretKey) {
    throw new AppError("DB_UNAVAILABLE", DB_UNAVAILABLE_MESSAGE, DB_UNAVAILABLE_STATUS);
  }
  return createClient(url, secretKey);
}
