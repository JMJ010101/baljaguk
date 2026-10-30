import type { Place } from "@/types";
import { buildPetPersona } from "@/lib/personas/pet";

// 페르소나는 코스를 만들 때 지킬 규칙을 함수로 내놓는다. 지금은 반려동물 하나만 구현하고 UI에는 노출하지 않는다.
export type Persona = {
  id: string;
  // courses.input에 저장하는 프로필 스냅샷이다.
  profile: Record<string, unknown>;
  // 데이터로 확인할 수 있는 hard 조건. 통과하지 못하는 장소는 후보에서 뺀다.
  hardFilters: Array<(place: Place) => boolean>;
  // AI 프롬프트로 넘기는 취향성(soft) 힌트
  softHints: string[];
};

export type PersonaId = "pet";

export function getPersona(id: PersonaId = "pet"): Persona {
  switch (id) {
    case "pet":
      return buildPetPersona();
  }
}
