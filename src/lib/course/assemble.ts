// 2차 hard 검사와 채택이다. AI가 고른 순서 있는 목록에서, 상세 확인(acmpyTypeCd 있음)을 통과한 장소로 코스를 만든다.
// - 앞 N곳을 병렬로 먼저 확인하고, hard에 걸린 만큼(그리고 덮지 못한 유형이 있으면 그 유형 우선)만 다음 순위를 추가로 확인한다.
// - 채택은 필요한 유형마다 가장 앞선 통과 장소를 먼저 확보하고 남은 자리를 AI 순서대로 채운다. 최종 순서는 AI의 원래 상대 순서다.
// 외부 호출은 verify로 주입받는다. 이 파일은 순수한 조립 로직이다.

export type PickVerdict = "pass" | "fail";
// 통과 여부를 알 수 없는 오류(외부 호출 실패 등)는 던진다. 실패(fail)는 "확인했더니 조건을 만족하지 않음"이다.
export type VerifyPick = (placeId: number) => Promise<PickVerdict>;

export type VerifyStats = {
  // 이번 호출에서 확인한 장소 id, 그중 hard 불통과 id, 확인 라운드 수
  verifiedIds: number[];
  failedIds: number[];
  rounds: number;
};

export type AdoptParams = {
  // AI가 고른 순서 있는 목록
  picks: number[];
  typeOf: (placeId: number) => number | undefined;
  // 후보에 있는 선택 유형. 채택된 장소가 각각 최소 1곳 있어야 한다.
  requiredTypeIds: readonly number[];
  targetCount: number;
  minCount: number;
  verify: VerifyPick;
  // 추가 라운드를 돌릴 시간이 남았는지
  canRunRound: () => boolean;
};

export type AdoptResult =
  | { ok: true; placeIds: number[]; stats: VerifyStats }
  | { ok: false; reason: "hard_shortage" | "type_uncovered" | "budget"; stats: VerifyStats };

export async function verifyAndAdopt(params: AdoptParams): Promise<AdoptResult> {
  const { picks, typeOf, requiredTypeIds, targetCount, minCount, verify, canRunRound } = params;
  const verdicts = new Map<number, PickVerdict>();
  let rounds = 0;
  let stoppedByBudget = false;

  const passedIds = () => picks.filter((id) => verdicts.get(id) === "pass");
  const uncoveredTypes = () => {
    const covered = new Set(passedIds().map(typeOf));
    return requiredTypeIds.filter((typeId) => !covered.has(typeId));
  };
  const satisfied = () => passedIds().length >= targetCount && uncoveredTypes().length === 0;

  // 한 라운드는 병렬이다. 오류가 하나라도 있으면 모두 끝난 뒤(남은 요청을 방치하지 않고) 첫 오류를 던진다.
  async function runRound(ids: number[]): Promise<void> {
    rounds++;
    const settled = await Promise.allSettled(ids.map(async (id) => [id, await verify(id)] as const));
    let failed = false;
    let reason: unknown;
    for (const outcome of settled) {
      if (outcome.status === "fulfilled") verdicts.set(outcome.value[0], outcome.value[1]);
      else if (!failed) {
        failed = true;
        reason = outcome.reason;
      }
    }
    if (failed) throw reason;
  }

  await runRound(picks.slice(0, targetCount));
  while (!satisfied()) {
    const unverified = picks.filter((id) => !verdicts.has(id));
    if (unverified.length === 0) break;
    if (!canRunRound()) {
      stoppedByBudget = true;
      break;
    }
    // 덮지 못한 유형의 장소를 먼저, 그다음 AI 순서대로 확인한다.
    const uncovered = new Set(uncoveredTypes());
    const prioritized = [
      ...unverified.filter((id) => uncovered.has(typeOf(id) ?? -1)),
      ...unverified.filter((id) => !uncovered.has(typeOf(id) ?? -1)),
    ];
    const need = Math.max(targetCount - passedIds().length, uncovered.size, 1);
    await runRound(prioritized.slice(0, need));
  }

  const passed = passedIds();
  const stats: VerifyStats = {
    verifiedIds: picks.filter((id) => verdicts.has(id)),
    failedIds: picks.filter((id) => verdicts.get(id) === "fail"),
    rounds,
  };
  if (passed.length < minCount) return { ok: false, reason: stoppedByBudget ? "budget" : "hard_shortage", stats };
  if (uncoveredTypes().length > 0) return { ok: false, reason: stoppedByBudget ? "budget" : "type_uncovered", stats };

  const chosen = new Set<number>();
  for (const typeId of requiredTypeIds) {
    const first = passed.find((id) => typeOf(id) === typeId);
    if (first !== undefined) chosen.add(first);
  }
  for (const id of passed) {
    if (chosen.size >= targetCount) break;
    chosen.add(id);
  }
  return { ok: true, placeIds: picks.filter((id) => chosen.has(id)), stats };
}
