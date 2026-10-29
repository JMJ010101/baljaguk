-- place_cache: 관광공사 상세 조회 결과를 캐시한다. data에 담을 내용은 placeCache 구현 시 확정한다.
create table public.place_cache (
  place_id   text primary key,
  data       jsonb not null,
  fetched_at timestamptz not null default now(),
  expires_at timestamptz not null
);

-- RLS를 켜고 정책은 만들지 않는다. 접근은 서버의 secret 키로만 하므로
-- anon, authenticated 역할은 이 테이블에 접근할 수 없다.
alter table public.place_cache enable row level security;

revoke all on table public.place_cache from anon, authenticated;

-- 새 테이블에는 API 역할 권한이 자동으로 붙지 않을 수 있어 같은 파일에서 명시적으로 부여한다.
grant select, insert, update, delete on table public.place_cache to service_role;
