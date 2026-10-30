-- usage_log: 호출 한도(rateLimit)를 세기 위한 기록이다. 허용된 요청만 한 줄씩 남긴다.
-- ip_hash: IP 원본이 아니라 비밀 소금으로 만든 HMAC 해시. 원본은 저장하지 않는다.
-- endpoint: 한도를 나누는 단위의 이름 (예: course)
-- 오래된 행 정리는 이 마이그레이션의 범위 밖이다.
create table public.usage_log (
  id         uuid primary key default gen_random_uuid(),
  ip_hash    text not null,
  endpoint   text not null,
  created_at timestamptz not null default now()
);

-- IP별 개수 조회(endpoint, ip_hash, 기간)와 전체 개수 조회(endpoint, 기간)용
create index usage_log_ip_idx on public.usage_log (endpoint, ip_hash, created_at);
create index usage_log_endpoint_idx on public.usage_log (endpoint, created_at);

-- RLS를 켜고 정책은 만들지 않는다. 접근은 서버의 secret 키로만 한다.
alter table public.usage_log enable row level security;

revoke all on table public.usage_log from anon, authenticated;

-- 새 테이블에는 API 역할 권한이 자동으로 붙을 수 있어서(002에서 service_role에 delete가 붙어 있던 것을 확인함)
-- 모두 회수한 뒤 필요한 권한만 부여한다. 이 범위에는 수정과 삭제가 없어서 select, insert만 준다.
revoke all on table public.usage_log from service_role;
grant select, insert on table public.usage_log to service_role;
