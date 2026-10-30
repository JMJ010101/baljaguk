// getSidoList/getSigunguList의 beforeTourCall 호출 시점을 고정하는 단위 테스트다. 관광공사는 가짜라 외부 호출은 0번이다.
// 실행: npx -y tsx@4.23.12 --conditions=react-server --test src/lib/tour/regions.test.ts
import assert from "node:assert/strict";
import { test } from "node:test";
import { AppError } from "@/lib/errors";
import { getSidoList, getSigunguList, type RegionsDeps } from "@/lib/tour/regions";

// 지역 캐시는 모듈 변수라 테스트마다 다른 시도 코드를 쓴다.
function harness(items: unknown[]) {
  const order: string[] = [];
  const deps = {
    fetchLdongCodes: async () => {
      order.push("fetch");
      return { items };
    },
  } as unknown as RegionsDeps;
  const hook = async () => {
    order.push("hook");
  };
  return { deps, order, hook };
}

const codeOf = async (promise: Promise<unknown>) => {
  try {
    await promise;
    return "no-error";
  } catch (e) {
    return e instanceof AppError ? `${e.code}/${e.status}` : `예상 밖 오류: ${String(e)}`;
  }
};

test("캐시에 없으면 관광공사를 부르기 전에 콜백을 한 번 부르고, 같은 키의 다음 호출은 캐시라 부르지 않는다", async () => {
  const { deps, order, hook } = harness([{ code: "101", name: "종로구" }]);
  const first = await getSigunguList("9001", { beforeTourCall: hook }, deps);
  assert.equal(first.regions.length, 1);
  assert.deepEqual(order, ["hook", "fetch"]);
  await getSigunguList("9001", { beforeTourCall: hook }, deps);
  assert.deepEqual(order, ["hook", "fetch"]);
});

test("콜백이 던지면 관광공사를 부르지 않고 캐시에도 저장하지 않는다", async () => {
  const { deps, order } = harness([{ code: "101", name: "종로구" }]);
  const denied = async () => {
    throw new AppError("RATE_LIMIT", "x", 429);
  };
  assert.equal(await codeOf(getSigunguList("9002", { beforeTourCall: denied }, deps)), "RATE_LIMIT/429");
  assert.deepEqual(order, []);
  await getSigunguList("9002", {}, deps);
  assert.deepEqual(order, ["fetch"]);
});

test("존재하지 않는 시도 코드(빈 항목)는 캐시되지 않아 매번 콜백을 부른다", async () => {
  const { deps, order, hook } = harness([{ code: "", name: "" }]);
  assert.equal(await codeOf(getSigunguList("9003", { beforeTourCall: hook }, deps)), "INVALID_INPUT/404");
  assert.equal(await codeOf(getSigunguList("9003", { beforeTourCall: hook }, deps)), "INVALID_INPUT/404");
  assert.deepEqual(order, ["hook", "fetch", "hook", "fetch"]);
});

test("시도 코드 형식이 틀리면 콜백도 관광공사 호출도 없다", async () => {
  const { deps, order, hook } = harness([]);
  assert.equal(await codeOf(getSigunguList("abc", { beforeTourCall: hook }, deps)), "INVALID_INPUT/400");
  assert.deepEqual(order, []);
});

test("시도 목록도 캐시에 없을 때만 콜백을 한 번 부른다", async () => {
  const { deps, order, hook } = harness([{ code: "11", name: "서울" }]);
  await getSidoList({ beforeTourCall: hook }, deps);
  await getSidoList({ beforeTourCall: hook }, deps);
  assert.deepEqual(order, ["hook", "fetch"]);
});
