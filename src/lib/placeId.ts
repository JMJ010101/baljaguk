import { z } from "zod";

// 양의 정수만 허용한다. 숫자 상한은 Number.isSafeInteger까지만 본다.
// /api/places/[id]와 상세 화면(app/places/[id])이 같은 규칙을 쓴다.
const idSchema = z
  .string()
  .regex(/^\d+$/)
  .transform(Number)
  .refine((id) => id > 0 && Number.isSafeInteger(id));

// 올바르지 않으면 undefined다. 어떻게 응답할지는 호출하는 쪽이 정한다.
export function parsePlaceId(raw: string): number | undefined {
  const parsed = idSchema.safeParse(raw);
  return parsed.success ? parsed.data : undefined;
}
