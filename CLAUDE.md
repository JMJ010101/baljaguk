# CLAUDE.md

## 프로젝트 개요
- 이름: 발자국
- 소개: 반려동물과 함께 갈 수 있는 장소만으로 하루 여행 코스를 만들어주는 서비스
- 목적: 5~6일 안에 만드는 개인 프로젝트이자 포트폴리오다. 구조 설계, 오류 처리, 프롬프트 버전 비교를 보여주는 것이 목표다.
- 개발 방식: 바이브코딩 (Claude Code + VS Code)

## 기술 스택
- Next.js 16.4.3 (App Router) + React 19.3.0 + TypeScript, Vercel 배포
- 스타일: Tailwind CSS v4 (package.json에 이미 설치되어 있다)
- 아직 설치되지 않은 패키지는 OpenAI SDK뿐이다. AI 연동 기능을 구현할 때 설치한다. 나머지 의존성은 package.json을 따른다.
- DB: Supabase (Postgres)
- AI: OpenAI API / 모델명: gpt-6-luna로 정함(사용자 결정). 가격, 구조화 출력, 추론 설정은 확인 필요
- 모델명은 한 곳(상수 또는 환경변수)에서만 정의한다. 프롬프트 버전을 비교할 때는 같은 모델로 비교한다.
- 검증: zod
- 장소 데이터: 한국관광공사 '반려동물 동반여행 서비스' API (공공데이터포털, 인증키 필요)
- 지도: 카카오 지도 API. 관광공사 API 응답에 좌표 필드(mapx, mapy)가 있으나 선택 항목이라 비어 있을 수 있다.
- 카카오 키는 2종류이고 용도가 다르다. (카카오 공식 문서 기준)
  - JavaScript 키: 브라우저에서 지도 Web(JavaScript) SDK를 쓸 때 사용한다. 이 키에 'JavaScript SDK 도메인'을 등록해야 한다.
  - REST API 키: 서버에서 REST API(장소 검색, 좌표 변환 등)를 호출할 때 사용한다. 허용 IP를 설정할 수 있다.
  - 지도 SDK에 REST API 키를 넣으면 에러가 난다. 키를 서로 바꿔 쓰지 않는다.
- 카카오디벨로퍼스에서 앱을 만들고 카카오맵 API 사용 설정을 ON으로 해야 한다.
- 카카오맵 API에는 무료 쿼터가 있고, 소진하면 429 에러가 난다. 429는 RATE_LIMIT으로 변환한다. (제안)
- 카카오 REST API 사용 여부: TODO(확인 필요): 쓰기로 정하기 전에는 REST API 키를 쓰는 코드를 만들지 않는다.
- TODO(확인 필요): 개발 주소(localhost)와 Vercel 배포 주소를 JavaScript SDK 도메인에 각각 등록해야 하는지, Next.js(App Router)에서 SDK를 불러오는 방법은 카카오 공식 문서를 확인한 뒤 기록
- 위 항목을 확인하기 전에는 지도 관련 패키지를 설치하지 않는다.

## 빌드/실행 명령어
- 개발 서버 `npm run dev` / 빌드 `npm run build` / 빌드 결과 실행 `npm run start` / 린트 `npm run lint`
- 테스트 스크립트는 없다. package.json에 없는 스크립트는 지어내서 실행하지 않는다. 추가가 필요하면 먼저 나에게 알린다.
- 기능 하나를 끝낼 때마다 `npm run lint`와 `npm run build`가 통과하는지 확인한다.

## 핵심 설계 원칙
1. 장소는 외부 API에서 가져온 "실제" 데이터만 사용한다.
   - AI는 장소를 만들어내지 않는다. 주어진 후보 중에서 고르고 순서만 정한다.
   - AI 응답에는 placeId만 받는다.
2. 반드시 지켜야 할 조건(hard)은 코드가 필터링한다. 취향성 조건(soft)만 AI 프롬프트로 전달한다.
3. 모든 AI 응답은 zod로 검증한다.
   - 검증에 실패하면 재시도하거나 사용자에게 오류 안내를 보여준다.
   - 검증되지 않은 AI 응답을 그대로 화면이나 DB에 쓰지 않는다.
4. 정보가 틀릴 수 있는 항목(동반 조건, 운영시간 등)에는 "방문 전 확인 필요" 안내를 표시한다.
5. 프롬프트는 lib/ai/prompts/ 에 버전 파일(v1, v2)로 관리한다.
   - 프롬프트 문자열을 코드 곳곳에 흩어놓지 않는다.
6. 페르소나(반려동물 프로필 기반 규칙)는 함수로 분리한다.
   - 나중에 다른 페르소나를 추가할 수 있는 구조로 만든다.
   - 지금은 반려동물 하나만 구현하고, UI에는 노출하지 않는다.

## 폴더 구조
```
src/
├─ app/ (page.tsx, places/page.tsx, places/[id]/page.tsx, places/[id]/loading.tsx, course/new/, course/[id]/, lab/, about/, error.tsx, not-found.tsx)
├─ app/api/ (places/route.ts, places/[id]/route.ts, regions/route.ts, course/route.ts)
├─ components/ (Button.tsx, Header.tsx, Pagination.tsx, PlaceCard.tsx, PlaceImage.tsx, RefreshButton.tsx, StatusScreen.tsx, Tag.tsx, VisitCheckNotice.tsx, places/InfoRow.tsx, places/InfoSection.tsx, places/PlaceDetailStatus.tsx, places/PlaceDetailView.tsx, places/PlacesExplorer.tsx, places/PlacesStatus.tsx)
├─ lib/
│  ├─ ai/ (client.ts, parse.ts, prompts/)
│  ├─ tour/ (client.ts, normalize.ts, places.ts, placeDetail.ts, regions.ts, contentTypes.ts)
│  ├─ db/ (client.ts, courses.ts, placeCache.ts, usage.ts)
│  ├─ personas/ (index.ts, pet.ts)
│  ├─ errors.ts, errorResponse.ts, placeId.ts, placesQuery.ts, rateLimit.ts
└─ types/index.ts
db/migrations/
```
- route.ts는 얇게 유지한다. 로직은 lib/에 둔다.
- lib/tour/: client.ts는 외부 API 호출, normalize.ts는 응답 변환만 담당한다. 캐시 조회·저장은 lib/db/placeCache.ts가 담당하고, 서비스 함수(placeDetail.ts)가 그것을 호출한다.
- places.ts는 둘을 엮어 목록을 만드는 서비스 함수다. 항목별 normalize 실패는 건너뛰고 skipped를 센다. 외부 호출이나 변환 로직을 places.ts에 직접 쓰지 않는다.
- placeDetail.ts(상세)는 client.ts, normalize.ts, lib/db/placeCache.ts를 엮는 서비스 함수다. 외부 호출, 변환, 쿼리 로직을 직접 쓰지 않는다. 흐름: 캐시 확인(placeCache) → detailCommon2 → detailPetTour2와 detailIntro2(동시) → 캐시 저장(placeCache).
- regions.ts(지역)는 client.ts의 fetchLdongCodes(ldongCode2 호출)로 시도·시군구 목록을 만드는 서비스 함수다. getSidoList(), getSigunguList(sidoCode)를 제공하고, 항목은 types/index.ts의 Region({ code, name })으로 검증하며 실패한 항목은 건너뛰고 skipped를 센다. sido 검증 패턴은 1~5자리 숫자이고, 시군구 결과가 비면 INVALID_INPUT 404를 던진다.
- app/api/regions/route.ts: GET /api/regions는 시도 목록, GET /api/regions?sido=11은 그 시도의 시군구 목록이다. sido가 패턴에 맞지 않으면 INVALID_INPUT 400이다.
- 장소 탐색 화면(app/places/page.tsx)은 서버 컴포넌트에서 getSidoList()로 시도 목록을 가져와 클라이언트 컴포넌트(PlacesExplorer)에 내려 주고, 장소 목록은 선택 값이 바뀔 때 /api/places를 호출한다. 선택 값은 URL 쿼리(?sido=&type=&page=)에 둔다. 기본값(type=12, page=1)은 URL에서 생략하고, 한 페이지는 PAGE_SIZE=20(lib/placesQuery.ts)이다. 허용 타입과 이름은 lib/tour/contentTypes.ts 한 곳에서 정의한다.
- 장소 카드(PlaceCard)에는 "방문 전 확인 필요"를 넣지 않는다. 카드는 동반 조건이나 영업시간을 보여 주지 않기 때문이다. 상세 화면에서 쓴다.
- 장소 상세(app/places/[id]/page.tsx)는 서버 컴포넌트에서 getPlaceDetail()을 직접 호출한다. 자기 API(/api/places/[id])를 다시 부르지 않는다. "목록으로" 링크는 sido/type/page 쿼리를 유지한다. 목록의 카드 링크가 같은 쿼리를 상세 주소에 실어 보낸다.
- db/migrations/ 에는 번호를 붙인 SQL 파일만 둔다.
- 한 파일에 로직을 몰아넣지 않는다.

## 보안 규칙
- OpenAI 키, 관광공사 API 키, Supabase secret 키(sb_secret_...)는 서버 코드에서만 사용한다.
- 위 키에는 NEXT_PUBLIC_ 접두사를 절대 붙이지 않는다.
- 서버에서 읽는 환경변수 이름은 SUPABASE_URL, SUPABASE_SECRET_KEY, TOUR_API_KEY다. 모두 NEXT_PUBLIC_ 접두사를 붙이지 않는다.
- Supabase는 secret 키(sb_secret_...)를 쓴다. 레거시 service_role 키는 쓰지 않는다.
- publishable 키는 로그인을 만들기 전까지 쓰지 않는다. 브라우저에서 Supabase를 직접 호출하지 않는다.
- 카카오 JavaScript 키는 브라우저에서 쓰는 키이므로 이 규칙의 예외다. 대신 JavaScript SDK 도메인 등록으로 사용 범위를 제한한다.
- 카카오 REST API 키는 서버 전용이다. NEXT_PUBLIC_ 접두사를 붙이지 않는다.
- .env* 파일은 커밋하지 않는다. .gitignore에 포함되어 있는지 가장 먼저 확인한다.
- lib/db 안의 파일은 'server-only'를 import한다.
- 모든 Supabase 테이블은 RLS를 켜둔 상태로 유지한다. secret 키는 RLS를 건너뛰지만 정책을 따로 만들지 않으므로, 접근은 서버(lib/db)에서만 된다.
- IP는 원본이 아니라 해시해서 저장한다.
- 키 값을 코드, 로그, 커밋 메시지에 직접 쓰지 않는다.

## DB 규칙
- DB 접근은 lib/db 안의 함수로만 한다.
- lib/db는 Supabase 오류를 DB_UNAVAILABLE AppError로 바꿔서 던진다.
- 화면이나 API Route에서 쿼리를 직접 쓰지 않는다.
- 스키마 변경은 db/migrations/ 에 번호를 붙인 새 SQL 파일로만 한다.
- 기존 마이그레이션 파일은 수정하지 않는다.
- 테이블: courses (owner_id는 NULL 허용), place_cache, usage_log
- 로그인은 아직 없다. 나중을 위해 courses.owner_id를 유지한다.
- JSONB로 저장한 데이터는 읽을 때 zod로 다시 검증한다.
- 컬럼 초안 (제안값, 첫 마이그레이션 작성 시 확정한다):
  - courses: id(uuid, PK), owner_id(uuid, NULL 허용), input(jsonb, 사용자 조건과 고정 기본 프로필 스냅샷, 기준점 placeId), result(jsonb, 순서가 있는 placeId 목록), prompt_version(text), created_at
  - place_cache: place_id(text, PK), data(jsonb, { place: Place, detail: PlaceDetail }), fetched_at, expires_at
  - usage_log: id, ip_hash(text), endpoint(text), created_at
- 컬럼을 위 초안에 임의로 추가하지 않는다. 필요하면 새 마이그레이션 파일로 추가한다.
- Supabase 무료 플랜 (2026-10-29 공식 문서 기준): DB 500MB, 활성 프로젝트 2개, 7일간 활동이 적으면 자동 일시 정지, 자동 백업 없음.
- 일시 정지는 DB_UNAVAILABLE(DB 연결 실패 화면)으로 처리한다. keep-alive는 현재 범위 밖이므로 내가 정하기 전에는 만들지 않는다. README에 첫 접속 실패 가능성을 적는다. (제안)
- TODO(확인 필요): 정지 후 복구 가능 기간. 공식 문서 버전마다 1년 / 90일로 다르게 적혀 있다.

## 오류 처리 규칙
- 에러는 lib/errors.ts의 AppError(code, userMessage, status)로 통일한다.
- 에러 코드는 아래 6개만 사용한다.
  - RATE_LIMIT, API_TIMEOUT, API_FAILED, BAD_AI_RESPONSE, INVALID_INPUT, DB_UNAVAILABLE
- 외부 API 호출에는 반드시 타임아웃을 건다.
  - 타임아웃 (제안값): 관광공사 API 8초, OpenAI API 20초
- 타임아웃 합계가 Vercel 함수 최대 실행 시간 안에 들어오는지 배포 전에 확인한다. (TODO(확인 필요): 현재 요금제의 최대 실행 시간)
- 위 숫자는 각 파일 상단의 상수로만 정의한다. 코드 중간에 숫자를 직접 쓰지 않는다.
- 관광공사 API 응답 오류코드는 아래처럼 AppError로 변환한다.
  - 05(서비스 연결실패) → API_TIMEOUT
  - 22(서비스 요청제한횟수 초과) → RATE_LIMIT. (초당 초과 코드 23은 공공데이터포털 안내 페이지에만 있고 매뉴얼에는 없다.)
  - 그 외 오류 → API_FAILED
  - 오류 코드 비교는 숫자로 한다(05, 0005, 5를 같게). 실제 응답에서 어떤 형태로 오는지는 확인하지 못했다.
- 공공데이터포털 오류 응답은 _type=json을 줘도 XML로 올 수 있다. JSON 파싱에 실패하면 XML 오류 본문(returnReasonCode)을 확인한 뒤 위 표대로 변환한다. 잘못된 서비스 키는 HTTP 403 + JSON(OpenAPI_ServiceResponse.cmmMsgHeader, errMsg SERVICE_KEY_IS_NOT_REGISTERED_ERROR, returnReasonCode 30)으로 왔다(호출 결과로 확인함). response.header가 없는 응답은 cmmMsgHeader의 returnReasonCode를 위 표대로 변환하고, 둘 다 없으면 API_FAILED다. TODO(확인 필요): 이 JSON 형태는 잘못된 키 한 경우에서만 확인했다. 호출 한도 초과나 서비스 연결 실패 같은 다른 오류가 XML로 오는지 JSON으로 오는지는 확인하지 못했다.
- 사용자에게는 상황별 안내 문구를 보여준다.
- 내부 에러 내용(스택, 원본 메시지)은 사용자에게 노출하지 않는다.
- AppError가 아닌 예외는 errorResponse.ts에서 API_FAILED(500)로 응답한다. 별도 코드는 만들지 않는다. (제안) 서버 로그에는 예외 이름만 남긴다.
- errorResponse.ts는 API Route에서 AppError를 { error: { code, message } } JSON 응답으로 바꿀 때 쓴다.
- 아래 상태 화면을 모두 구현한다.
  - 로딩, 빈 결과, API 실패, 호출 한도 초과, 코스 생성 실패, 유효하지 않은 링크, DB 연결 실패
- 자체 호출 한도 (제안값, ip_hash 기준): 코스 생성 시간당 5회, 장소 조회 분당 30회
- AI 응답 검증 실패 시 재시도는 최대 1회(총 2번 호출)로 제한한다. 그래도 실패하면 BAD_AI_RESPONSE를 던진다.
- 관광공사 API 호출 실패는 자동 재시도하지 않는다. (호출 한도를 아끼기 위해)
- 장소 목록 API Route: 목록 항목 하나의 normalize가 실패하면 그 항목만 건너뛰고 skipped 개수를 응답에 포함한다. 원본 응답과 키는 로그에 남기지 않는다. (제안)

## 외부 API 규칙 (한국관광공사, 활용매뉴얼 Ver4.1 기준)
- 서비스: KorPetTourService2 / 기본 URL: apis.data.go.kr/B551011/KorPetTourService2 / REST(GET), 응답은 기본 XML이고 `_type=json`을 붙이면 JSON이다. HTTPS를 사용한다.
- 모든 요청에 serviceKey(필수), MobileOS(필수, 웹 서비스이므로 ETC), MobileApp(필수, 서비스명)을 넣는다.
- 사용하는 오퍼레이션:
  - areaBasedList2(지역기반 목록), locationBasedList2(위치기반 목록, mapX/mapY/radius 필수, radius 최대 20000m), searchKeyword2(키워드 검색)
  - detailCommon2(공통정보), detailIntro2(소개정보: 운영시간, 쉬는 날 등), detailPetTour2(반려동물 동반 정보)
  - 이 외 오퍼레이션(detailInfo2, detailImage2, petTourSyncList2, ldongCode2, lclsSystmCode2)은 필요해질 때만 쓴다.
- 목록 응답에는 contentid, contenttypeid, title, addr1, mapx, mapy, firstimage, modifiedtime 등이 있다. 동반 조건과 운영시간은 목록에 없다.
  - 실제 호출로 확인한 목록 필드: addr1, addr2, areacode, cat1~cat3, contentid, contenttypeid, createdtime, firstimage, firstimage2, cpyrhtDivCd, mapx, mapy, mlevel, modifiedtime, sigungucode, tel, title, zipcode, lDongRegnCd, lDongSignguCd, lclsSystm1~lclsSystm3
  - showflag는 목록(areaBasedList2) 응답에 없다.
  - 목록 호출(areaBasedList2)은 numOfRows, pageNo와 선택 파라미터 contentTypeId(12, 14, 15, 28, 32, 38, 39만 허용), arrange(A, C, D, O, Q, R만 허용)를 쓴다. zod로 검증하고 위반하면 INVALID_INPUT(400)이다.
  - totalCount (호출 결과로 확인함): 응답 body.totalCount는 contentTypeId 필터를 반영한다(파라미터 없음 9658(호출 시점의 값), contentTypeId=12 753). numOfRows가 바뀌어도 변하지 않는다.
  - contentTypeId=12, numOfRows=5에서 pageNo=151은 3건, 152는 0건이었다(753건과 일치). 파라미터 없는 호출의 마지막 페이지는 확인하지 못했다.
  - 응답 body.numOfRows는 요청값이 아니라 실제 반환 건수로 온다(호출 결과로 확인함). 페이지 크기로 쓰지 않는다.
  - arrange (호출 결과로 확인함, 매뉴얼에 기본값 설명은 없음): arrange=Q는 수정일 내림차순으로 정렬되었고 50건 중 firstimage가 없는 건이 0건이었다(파라미터 없는 호출은 4건). 매뉴얼 설명은 "대표이미지가 반드시 있는 정렬"이다. O, R은 호출해 본 적이 없다.
  - arrange=Q에서도 totalCount는 줄지 않았다(9658, 호출 시점의 값). arrange가 O/Q/R일 때 totalCount로 페이지 수를 계산하지 않는다.
  - 파라미터 없는 호출의 기본 정렬은 수정일 순서가 아니었다.
  - 지역 파라미터 (매뉴얼 확인): areaCode가 아니라 lDongRegnCd(시도), lDongSignguCd(시군구, lDongRegnCd 필수), lclsSystm1~3이다. 이번 단계에서는 lDongRegnCd(시도)만 목록 호출에 보낸다(앱 쪽 쿼리 이름은 sido). lDongSignguCd와 lclsSystm1~3은 구현하지 않는다. 확인됨(docs/manual.docx 오퍼레이션 10): lDongRegnCd 없으면 시도 목록, 있으면 그 시도의 시군구 목록. 응답은 code, name
  - lDongListYn=Y에서 lDongRegnCd를 생략했을 때의 동작은 확인 필요
  - 탐색 화면의 지역 필터는 선택이다. 코스 생성에서는 시도(lDongRegnCd)를 필수로 받고, 시군구(lDongSignguCd)는 선택이다.
  - 세종특별자치시의 시도 코드는 5자리(36110)다. 다른 시도는 2자리다. (호출 결과로 확인함, 2026-10-30, 시도 16개) 그래서 시도 코드 검증은 2자리가 아니라 1~5자리 숫자다.
- 동반 조건은 detailPetTour2(acmpyTypeCd, acmpyPsblCpam, acmpyNeedMtr, etcAcmpyInfo 등), 운영시간은 detailIntro2(타입별로 필드명이 다르다)로 장소마다 따로 조회해야 한다.
- 운영시간 필드명은 타입마다 다르다. 쇼핑(38)은 opentime이고, 형식이 일정하지 않다(`09:00-20:00`, `09:00~22:00`). 파싱하지 말고 문자열 그대로 보여준다.
- detailIntro2는 contentTypeId를 항상 함께 보낸다. contentTypeId는 필수다(매뉴얼 확인). (호출 결과로 확인함: 포함하면 4곳 모두 성공, 뺀 1곳은 정상 응답을 받지 못했다.)
- detailIntro2 응답 필드는 타입마다 다르다. 호출 결과로 확인한 타입은 12, 14, 28, 32, 38, 39다(14, 28은 각 1곳). TODO(확인 필요): 15
- 운영시간 필드(호출 결과로 본 이름, 의미는 매뉴얼 미확인): 12 usetime / 38 opentime / 39 opentimefood. 쉬는 날: 12 restdate / 38 restdateshopping / 39 restdatefood. 파싱하지 않고 문자열 그대로 보여준다. 12의 usetime에는 숙박 형태 문장이 들어 있는 경우가 있었다.
- 14, 28의 운영시간·쉬는 날 필드(14 usetimeculture/restdateculture, 28 usetimeleports/restdateleports)는 각 1곳 호출로 확인했다. 15, 32는 이용시간·쉬는 날 개념이 달라 이번 화면에서는 보여 주지 않고, 상세 화면에서 운영시간 행을 숨기고 안내 문구를 쓴다.
- chkpet, chkpetshopping은 비어 있었고 의미를 확인하지 못했다. 동반 조건에 쓰지 않는다. 동반 정보 출처는 detailPetTour2뿐이다.
- reservationurl 등에는 HTML 태그(`<a>`)가 섞여 있을 수 있다. detailCommon2의 homepage에도 섞인 경우가 있었다(샘플 1곳). 화면에 그대로 렌더링하지 않는다.
- 위 동반 정보 필드는 모두 선택 항목이고 매뉴얼 예시상 자유 텍스트다. 값이 없으면 빈 문자열("")로 온다.
  - 실제 호출로 확인한 acmpyTypeCd 값(샘플 8곳): `전구역 동반가능`, `일부구역 동반가능`. 다른 값이 있는지는 TODO(확인 필요)
  - 나머지 필드(acmpyPsblCpam, acmpyNeedMtr, etcAcmpyInfo, relaAcdntRiskMtr 등)는 장소마다 채워지는 항목이 다른 자유 텍스트다. 구역, 견종, 몸무게 조건이 여기에만 적혀 있다. etcAcmpyInfo에는 줄바꿈(\n)이 들어갈 수 있다.
  - hard 조건(제안): acmpyTypeCd 값이 있는 장소만 후보로 둔다. 구역, 견종, 몸무게 등 자유 텍스트 조건은 코드로 필터링하지 않고 soft 조건(AI 프롬프트)과 "방문 전 확인 필요" 안내로 처리한다.
  - acmpyTypeCd가 빈 장소: 샘플 8곳에서는 없었다. 전체는 TODO(확인 필요)
- 응답에 없는 필드를 추측해서 쓰지 않는다. 필드를 쓰기 전에 매뉴얼을 확인한다.
- 응답은 반드시 normalize 함수로 우리 Place 타입으로 변환한 뒤 사용한다.
  - 숫자도 문자열로 온다(contentid, mapx, mapy). normalize에서 숫자로 변환한다.
  - 값이 없으면 빈 문자열("")로 온다. normalize에서 undefined로 바꾼다.
  - mapx는 경도, mapy는 위도다(WGS84). 순서를 뒤집지 않는다.
  - 좌표가 없는 장소는 코스 후보에서 제외한다. (제안)
  - 코스 후보에서 숙박(32)과 행사(15)는 제외한다. 장소 탐색 화면에는 그대로 보여준다.
  - petTourSyncList2를 쓰게 될 때만 showflag를 다룬다. (제안)
- 원본 응답을 컴포넌트나 AI 프롬프트에 직접 넘기지 않는다.
- 이미지의 cpyrhtDivCd가 Type3이면 변형(자르기, 필터 등)하지 않는다. 이미지에는 출처를 표시한다.
- cpyrhtDivCd는 매뉴얼에서 Type1 "출처표시-권장", Type3 "제1유형 + 변경금지"만 확인했다. TODO(확인 필요): 출처 표시가 필수인지, 공공누리 이용 조건의 범위. 상세 화면에는 "사진 출처:" 문구를 쓰지 않는다.
- contentTypeId: 코드표는 12(관광지), 14(문화시설), 15(행사/공연/축제), 28(레포츠), 32(숙박), 38(쇼핑), 39(음식점)이다. 단, 목록·소개 조회의 파라미터 설명에는 75, 76 등 다른 값이 적혀 있어 문서가 서로 맞지 않는다.
  - 실제 호출 결과 12, 28, 32, 38, 39가 나왔고 75, 76은 나오지 않았다. 코드표(12 계열)를 따른다. 75, 76으로 직접 호출해 보지는 않았다.
  - TODO(확인 필요): 14(문화시설), 15(행사/공연/축제)는 아직 확인하지 못했다.
- 호출 한도: 개발계정은 일 1,000건이다. 장소 1곳의 동반 정보와 운영시간을 보려면 최소 2번(detailPetTour2, detailIntro2) 더 호출해야 하므로, 상세 조회는 후보로 좁혀진 장소에만 한다.
- 상세 조회는 place_cache에 먼저 확인하고, 없거나 expires_at이 지났을 때만 외부 API를 호출한다.
- detailCommon2(공통정보)는 contentId만 보내 샘플 4곳(12, 32, 38, 39)에서 정상 응답을 받았다. 매뉴얼 확인(Ver4.1): 요청은 serviceKey, MobileOS, MobileApp, contentId가 필수이고 contentTypeId는 요청 항목에 없어 보내지 않는다. 호출 결과로 확인함: 12, 32, 39 세 곳에서 items.item은 길이 1의 배열이고, title, addr1, mapx, mapy, firstimage, cpyrhtDivCd는 세 곳 모두 값이 있었다(38은 getPlaceDetail로 normalizePlace 통과와 title, 좌표, 이미지, cpyrhtDivCd 값 유무만 확인했다). 목록 필드에 없는 것은 telname, homepage, overview다. tel, telname, addr2 등은 장소마다 비어 있었다. 필드명과 의미는 매뉴얼 확인. 단 cat1~3은 매뉴얼 응답 표에 없지만 실제 응답에는 온다(호출 결과로 확인함). 호출 결과로 확인함: normalizePlace가 detailCommon2 응답에 그대로 통했다(표본 4곳). 존재하지 않는 contentId는 오류가 아니라 resultCode 0000의 빈 items로 온다(getPlaceDetail의 404 처리 근거).
- detailCommon2로 상세 화면의 Place를 만든다. 선택 항목(주소, 이미지, 좌표 등)은 비어 있을 수 있어 optional로 처리한다. 표본이 4곳이라 항상 값이 있다고 단정하지 않는다.
- 캐시 만료 기간 (제안값): 24시간. 매뉴얼의 데이터 갱신주기가 일 1회다. (공공데이터포털 페이지에는 "실시간"이라고 적혀 있어 두 자료가 다르다.)
- 알려진 제약: 상세 조회에서 detailPetTour2나 detailIntro2가 빈 응답을 주면 모든 필드가 비어 있는 상세로 만들어 place_cache에 저장한다. 일시적인 빈 응답이어도 만료(24시간)까지 "정보 없음"으로 보일 수 있다.

## 작업 방식
- 한 번에 한 기능씩 구현한다.
- UI를 만들거나 고치기 전에 DESIGN.md를 읽고 따른다.
- 기능 하나가 동작할 때마다 커밋하자고 나에게 알려준다.
- 파일을 크게 바꾸기 전에 어떤 파일을 어떻게 바꿀지 먼저 요약해서 보여준다.
- 요청하지 않은 기능이나 라이브러리를 임의로 추가하지 않는다.
- 불확실한 사실(API 스펙, 라이브러리 사용법)은 추측하지 않는다. 공식 문서 확인이 필요하다고 말한다.

## 하지 말 것
- AI에게 계산이나 사실 검증을 맡기지 않는다.
- 클라이언트 컴포넌트에서 DB나 외부 API를 직접 호출하지 않는다.
- 한 파일에 로직을 몰아넣지 않는다.
- 로그인, 결제 등 현재 범위 밖의 기능을 만들지 않는다.