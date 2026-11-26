create table public.citizen_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  profile jsonb not null check (jsonb_typeof(profile) = 'object'),
  contract_name text,
  contract_pdf text,
  revision integer not null default 1,
  check ((contract_name is null) = (contract_pdf is null)),
  check (length(contract_pdf) <= 2796204)
);

alter table public.citizen_profiles enable row level security;
revoke all on public.citizen_profiles from anon, authenticated;
grant select, insert, update on public.citizen_profiles to service_role;

create table public.citizen_rate_limits (
  bucket text primary key,
  expires_at timestamptz not null,
  attempts integer not null
);

alter table public.citizen_rate_limits enable row level security;
revoke all on public.citizen_rate_limits from anon, authenticated;

create function public.citizen_rate_limit(bucket_key text, max_attempts integer)
returns boolean
language sql
set search_path = ''
as $$
  with hit as (
    insert into public.citizen_rate_limits as limits (bucket, expires_at, attempts)
    values (bucket_key, now() + interval '15 minutes', 1)
    on conflict (bucket) do update
    set attempts = case when limits.expires_at <= now() then 1 else limits.attempts + 1 end,
        expires_at = case when limits.expires_at <= now() then excluded.expires_at else limits.expires_at end
    returning attempts
  )
  select attempts <= max_attempts from hit;
$$;

create function public.citizen_account_exists(account_email text)
returns boolean
language sql
security definer
set search_path = ''
as $$
  select exists (
    select 1 from auth.users as account
    join public.citizen_profiles as profile on profile.user_id = account.id
    where account.email = account_email
  );
$$;

revoke all on function public.citizen_rate_limit(text, integer) from public, anon, authenticated;
revoke all on function public.citizen_account_exists(text) from public, anon, authenticated;
grant execute on function public.citizen_rate_limit(text, integer) to service_role;
grant execute on function public.citizen_account_exists(text) to service_role;
grant select, insert, update on public.citizen_rate_limits to service_role;
