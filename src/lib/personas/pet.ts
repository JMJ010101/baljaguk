import type { Persona } from "@/lib/personas";

// 반려동물은 한 마리만 다룬다. 프로필 입력 UI는 없고 고정 기본 프로필을 쓴다. (사용자 결정, 2026-10-31)
export type PetProfile = { petCount: 1 };

export const DEFAULT_PET_PROFILE: PetProfile = { petCount: 1 };

export function buildPetPersona(profile: PetProfile = DEFAULT_PET_PROFILE): Persona {
  return {
    id: "pet",
    profile,
    // 데이터로 확인할 수 있는 hard 조건(지역, 유형, 좌표)은 후보 수집(lib/tour/candidates.ts)이 처리한다.
    // 크기·견종·몸무게 제한은 자유 텍스트로만 있어 hard로 쓸 수 없다. (CLAUDE.md)
    hardFilters: [],
    softHints: ["반려동물 한 마리와 함께 하루 동안 다니는 코스예요."],
  };
}
