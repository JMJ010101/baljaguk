import { COURSE_EXTRA_PICKS, COURSE_MAX_COUNT } from "@/lib/course/constants";

// AI에게 요청할 장소 수다. 최대 장소 수 + 여분이고, 후보가 모자라면 있는 만큼으로 줄인다.
export function getRequestedPickCount(poolSize: number): number {
  return Math.min(COURSE_MAX_COUNT + COURSE_EXTRA_PICKS, poolSize);
}
