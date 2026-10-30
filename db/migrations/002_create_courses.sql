-- courses: 생성된 코스를 저장한다. id는 서버에서 만든 uuid를 넣는다(default 없음).
-- input: 사용자 조건과 고정 기본 프로필 스냅샷, 기준점 placeId와 반경, 후보가 없던 유형(missingTypes)
-- result: 순서가 있는 placeId 목록만 { "placeIds": [...] }
create table public.courses (
  id             uuid primary key,
  owner_id       uuid,
  input          jsonb not null,
  result         jsonb not null,
  prompt_version text not null,
  created_at     timestamptz not null default now()
);

-- RLS를 켜고 정책은 만들지 않는다. 접근은 서버의 secret 키로만 하므로
-- anon, authenticated 역할은 이 테이블에 접근할 수 없다.
alter table public.courses enable row level security;

revoke all on table public.courses from anon, authenticated;

-- 새 테이블에는 API 역할 권한이 자동으로 붙지 않을 수 있어 같은 파일에서 명시적으로 부여한다.
-- 이 범위에는 수정과 삭제가 없어서 select, insert만 준다.
revoke all on table public.courses from service_role;
grant select, insert on table public.courses to service_role;
