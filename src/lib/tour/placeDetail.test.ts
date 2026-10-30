// getPlaceDetail의 beforeTourCalls 호출 시점을 고정하는 단위 테스트다. 캐시와 관광공사는 가짜라 외부 호출은 0번이다.
// 실행: npx -y tsx@4.23.12 --conditions=react-server --test src/lib/tour/placeDetail.test.ts
import assert from "node:assert/strict";
import { test } from "node:test";
import { AppError } from "@/lib/errors";
import { getPlaceDetail, type PlaceDetailDeps } from "@/lib/tour/placeDetail";

function harness(options: { cached?: boolean; cacheError?: boolean } = {}) {
  const order: string[] = [];
  const deps = {
    getCachedPlace: async () => {
      order.push("cache");
      if (options.cacheError) throw new AppError("DB_UNAVAILABLE", "x", 503);
      return options.cached ? { place: { id: 1 }, detail: { placeId: 1 } } : null;
    },
    setCachedPlace: async () => {
      order.push("save");
    },
    // 빈 items는 존재하지 않는 장소다. 첫 호출에서 404로 끝나서 이후 호출과 정규화는 필요 없다.
    fetchCommonDetail: async () => {
      order.push("common");
      return [];
    },
    fetchPetTourDetail: async () => {
      order.push("pet");
      return [];
    },
    fetchIntroDetail: async () => {
      order.push("intro");
      return [];
    },
  } as unknown as PlaceDetailDeps;
  return { deps, order };
}

const codeOf = async (promise: Promise<unknown>) => {
  try {
    await promise;
    return "no-error";
  } catch (e) {
    return e instanceof AppError ? `${e.code}/${e.status}` : `예상 밖 오류: ${String(e)}`;
  }
};

test("캐시에 있으면 콜백도 관광공사 호출도 없다", async () => {
  const { deps, order } = harness({ cached: true });
  let called = 0;
  await getPlaceDetail(
    1,
    {
      beforeTourCalls: async () => {
        called += 1;
      },
    },
    deps,
  );
  assert.equal(called, 0);
  assert.deepEqual(order, ["cache"]);
});

test("캐시에 없으면 첫 관광공사 호출 전에 콜백을 정확히 한 번 부른다", async () => {
  const { deps, order } = harness();
  const result = await codeOf(
    getPlaceDetail(
      1,
      {
        beforeTourCalls: async () => {
          order.push("hook");
        },
      },
      deps,
    ),
  );
  assert.equal(result, "INVALID_INPUT/404");
  assert.deepEqual(order, ["cache", "hook", "common"]);
});

test("콜백이 던지면 관광공사를 부르지 않고 그 오류로 끝난다", async () => {
  const { deps, order } = harness();
  const result = await codeOf(
    getPlaceDetail(
      1,
      {
        beforeTourCalls: async () => {
          throw new AppError("RATE_LIMIT", "x", 429);
        },
      },
      deps,
    ),
  );
  assert.equal(result, "RATE_LIMIT/429");
  assert.deepEqual(order, ["cache"]);
});

test("캐시 조회가 DB 오류면 콜백을 부르지 않는다", async () => {
  const { deps, order } = harness({ cacheError: true });
  let called = 0;
  const result = await codeOf(
    getPlaceDetail(
      1,
      {
        beforeTourCalls: async () => {
          called += 1;
        },
      },
      deps,
    ),
  );
  assert.equal(result, "DB_UNAVAILABLE/503");
  assert.equal(called, 0);
  assert.deepEqual(order, ["cache"]);
});

test("콜백을 주지 않아도 동작한다(코스 생성의 상세 확인이 이 경로다)", async () => {
  const { deps, order } = harness();
  const result = await codeOf(getPlaceDetail(1, { deadlineAt: Date.now() + 60_000, reserveMs: 10_000 }, deps));
  assert.equal(result, "INVALID_INPUT/404");
  assert.deepEqual(order, ["cache", "common"]);
});
