// 장소 상세의 ?course= 값으로 "코스로 돌아가기" 주소를 만든다.
// 값이 uuid 형식일 때만 우리 사이트 안의 /course/<uuid> 경로를 만든다. 그 밖의 값(외부 주소, 다른 경로, 배열 등)은 받지 않는다.
// 클라이언트에서도 쓸 수 있어서 server-only 파일을 import하지 않는다.
import { z } from "zod";

const COURSE_PATH_PREFIX = "/course/";
const uuidSchema = z.uuid();

export function buildCourseBackHref(value: string | string[] | null | undefined): string | undefined {
  if (typeof value !== "string") return undefined;
  const parsed = uuidSchema.safeParse(value);
  return parsed.success ? `${COURSE_PATH_PREFIX}${parsed.data}` : undefined;
}

// 링크 복사에 쓰는 절대 주소다. 코스 id(uuid)만 받고, 주소에는 id 말고 아무것도 붙이지 않는다. (쿼리, 해시 없음)
// origin은 브라우저의 window.location.origin을 넘긴다. http(s)가 아니거나 해석할 수 없으면 undefined다.
export function buildCourseShareUrl(origin: string, id: string): string | undefined {
  const parsedId = uuidSchema.safeParse(id);
  if (!parsedId.success) return undefined;
  let base: URL;
  try {
    base = new URL(origin);
  } catch {
    return undefined;
  }
  if (base.protocol !== "https:" && base.protocol !== "http:") return undefined;
  return `${base.origin}${COURSE_PATH_PREFIX}${parsedId.data}`;
}
