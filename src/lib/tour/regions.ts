import { z } from "zod";
import { AppError } from "@/lib/errors";
import { fetchLdongCodes } from "@/lib/tour/client";
import type { Region } from "@/types";

export type RegionsResult = {
  regions: Region[];
  skipped: number;
};

const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
// 시군구가 가장 많은 시도가 55개(2026-10-30 호출 결과)라 한 번에 받는다.
const NUM_OF_ROWS = 100;
const FIRST_PAGE = 1;
// 세종특별자치시의 시도 코드가 5자리(36110)라 1~5자리 숫자를 허용한다. route.ts도 이 값을 쓴다.
export const SIDO_CODE_PATTERN = /^\d{1,5}$/;
export const INVALID_INPUT_MESSAGE = "요청 값이 올바르지 않아요. 다시 확인해 주세요.";
export const INVALID_INPUT_STATUS = 400;
const NOT_FOUND_STATUS = 404;

// 응답 필드는 code, name만 쓴다. 코드 자릿수는 매뉴얼에 없어 길이를 강제하지 않는다.
// 존재하지 않는 시도 코드는 code, name이 빈 문자열인 항목 1개로 오므로(호출 결과로 확인함) 여기서 걸러진다.
const regionSchema = z.object({
  code: z.string().min(1),
  name: z.string().min(1),
});

// 모듈 변수 캐시다. 인스턴스별 캐시이며 보장은 아니다. 실패와 빈 결과는 저장하지 않는다.
const cache = new Map<string, { result: RegionsResult; expiresAt: number }>();

// lDongListYn은 보내지 않는다. 기본값이 N이라는 설명은 매뉴얼 근거 없음, 호출로 확인(code, name만 옴).
async function loadRegions(cacheKey: string, lDongRegnCd?: string): Promise<RegionsResult> {
  const cached = cache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return cached.result;

  const { items } = await fetchLdongCodes({ numOfRows: NUM_OF_ROWS, pageNo: FIRST_PAGE, lDongRegnCd });
  const regions: Region[] = [];
  let skipped = 0;

  items.forEach((raw, index) => {
    const parsed = regionSchema.safeParse(raw);
    if (parsed.success) {
      regions.push(parsed.data);
    } else {
      skipped++;
      console.warn(`지역 항목 검증 실패로 건너뜀: cacheKey=${cacheKey} index=${index}`);
    }
  });

  const result = { regions, skipped };
  if (regions.length > 0) cache.set(cacheKey, { result, expiresAt: Date.now() + CACHE_TTL_MS });
  return result;
}

export function getSidoList(): Promise<RegionsResult> {
  return loadRegions("sido");
}

// 시군구는 시도 코드 없이 조회하지 않는다.
export async function getSigunguList(sidoCode: string): Promise<RegionsResult> {
  if (!SIDO_CODE_PATTERN.test(sidoCode)) {
    throw new AppError("INVALID_INPUT", INVALID_INPUT_MESSAGE, INVALID_INPUT_STATUS);
  }
  const result = await loadRegions(`sigungu:${sidoCode}`, sidoCode);
  // 존재하지 않는 시도 코드는 빈 문자열 항목 1개로 와서 전부 건너뛰어진다. 빈 결과는 loadRegions가 캐시하지 않는다.
  if (result.regions.length === 0) {
    throw new AppError("INVALID_INPUT", INVALID_INPUT_MESSAGE, NOT_FOUND_STATUS);
  }
  return result;
}
