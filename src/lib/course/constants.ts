// 코스 생성에서 쓰는 숫자는 모두 이 파일 한 곳에 둔다. (CLAUDE.md: 숫자는 상수로만 정의한다)

// 한 코스의 장소 수. AI에게는 최대 장소 수 + 여분을 순서 있는 목록으로 요청하고, 코드가 hard 검증을 통과한 앞쪽을 채택한다.
export const COURSE_MIN_COUNT = 3;
export const COURSE_MAX_COUNT = 5;
export const COURSE_EXTRA_PICKS = 2;

// 한 번에 고를 수 있는 장소 유형 수
export const MAX_SELECTED_TYPES = 3;

// 후보 수집
// 유형별 지역 목록을 한 번에 받는 건수. 500은 실제로 받아졌고 그 이상은 확인하지 못했다.
export const AREA_LIST_NUM_OF_ROWS = 500;
// 반경은 앞에서부터 시도하고 후보가 모자라면 다음 값으로 넓힌다. (코드가 거리를 계산한다)
export const RADIUS_LADDER_METERS: readonly number[] = [20_000, 50_000];
// 기준점으로 시도해 볼 장소 수. 같은 목록 안에서 고르므로 추가 호출이 없다.
export const ANCHOR_ATTEMPTS = 3;
// 기준점을 우선해서 고르는 유형(관광지)
export const ANCHOR_PREFERRED_TYPE_ID = 12;
// 유형당 가까운 순으로 남기는 후보 수와 전체 상한
export const PER_TYPE_LIMIT = 20;
export const MAX_POOL = 60;
// 후보가 이 수보다 적으면 코스를 만들지 않는다. (최소 코스 크기)
export const MIN_POOL = COURSE_MIN_COUNT;

// 코스 한 건을 만드는 데 쓸 수 있는 전체 시간(ms)이다. 코스 route의 maxDuration(90초)보다 작게 둔다.
export const COURSE_BUDGET_MS = 80_000;
// 저장 단계를 위해 남겨 두는 시간이다. DB 쓰기 5초 + 타임아웃 뒤 확인 읽기 5초. 저장 앞 단계들은 마감에서 이만큼 뺀 시각까지만 쓴다.
export const COURSE_SAVE_RESERVE_MS = 10_000;
// 상세 확인 한 라운드의 최악 시간이다. 관광공사 타임아웃 8초 x 직렬 2단계(detailCommon2 -> detailPetTour2와 detailIntro2).
export const COURSE_VERIFY_ROUND_MS = 16_000;

// 화면(클라이언트)
// 코스 생성 요청을 기다리는 최대 시간이다. 서버 마감(COURSE_BUDGET_MS)과 route의 maxDuration(90초)보다 길게 둬서 서버의 응답이 먼저 오게 한다.
export const COURSE_CLIENT_WAIT_MS = 100_000;
// 시군구 목록 호출(/api/regions)을 기다리는 최대 시간이다. 서버가 캐시 없이 가장 오래 걸리는 경로의 단순 합 18초
// (호출 한도 확인의 건수 조회 DB 5초 + 사용 기록 DB 5초 + 관광공사 8초. 각각 rateLimit.ts, db/client.ts의 DB_TIMEOUT_MS, tour/client.ts의 TOUR_TIMEOUT_MS)
// 보다 길게 둬서 서버의 정상 오류 응답을 끊지 않는다. 서버 상수는 server-only라 import할 수 없어 숫자를 옮겨 적었다.
// 콜드 스타트 같은 다른 지연은 반영하지 못했다. 멈춘 요청에서는 최대 이만큼 기다리고, 미리 채운 시군구가 있으면 그동안 제출 버튼이 막힌다.
export const SIGUNGU_CLIENT_WAIT_MS = 25_000;
// 생성 중 진행 안내 문구가 바뀌는 경과 시간이다. 임시값이며 실제 서버 단계와 연결하지 않는다.
export const PROGRESS_STAGE_START_MS: readonly number[] = [0, 10_000, 30_000, 60_000];

// 카카오 지도(코스 결과 화면). 아래 세 값은 모두 임시값이고 공식 문서에서 근거를 찾지 못했다. (확인 필요)
// 지도 SDK를 불러오는 데 기다리는 최대 시간이다. 넘기면 로드 실패 화면(코스 목록은 그대로)을 보여 준다.
export const KAKAO_MAP_LOAD_WAIT_MS = 10_000;
// 장소가 1곳일 때의 지도 확대 수준이다. 카카오 지도는 숫자가 작을수록 가깝게 보인다.
export const KAKAO_MAP_SINGLE_STOP_LEVEL = 4;
// 여러 곳을 한 화면에 맞출 때 가장자리에 남기는 여백(px)이다.
export const KAKAO_MAP_BOUNDS_PADDING_PX = 32;
