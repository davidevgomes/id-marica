create table public.citizen_identity_checks (
  id uuid primary key default gen_random_uuid(),
  cpf_key text not null,
  pin text not null,
  started_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '15 minutes'),
  verified_at timestamptz
);

create index citizen_identity_checks_expiry on public.citizen_identity_checks (expires_at);
create index citizen_rate_limits_expiry on public.citizen_rate_limits (expires_at);
alter table public.citizen_identity_checks enable row level security;
revoke all on public.citizen_identity_checks from anon, authenticated;
grant select, insert, update, delete on public.citizen_identity_checks to service_role;
