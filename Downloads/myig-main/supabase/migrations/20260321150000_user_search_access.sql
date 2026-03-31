create table if not exists public.user_search_access (
  user_id uuid primary key references auth.users (id) on delete cascade,
  free_searches_used integer not null default 0 check (free_searches_used >= 0),
  free_search_limit integer not null default 7 check (free_search_limit > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_subscription_entitlements (
  user_id uuid primary key references auth.users (id) on delete cascade,
  is_active boolean not null default false,
  status text not null default 'inactive'
    check (status in ('active', 'grace_period', 'billing_retry', 'expired', 'revoked', 'cancelled', 'inactive', 'pending')),
  product_id text,
  renewal_period text,
  purchase_source text not null default 'app_store',
  expires_at timestamptz,
  will_renew boolean,
  original_transaction_id text,
  verified_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists user_subscription_entitlements_active_idx
  on public.user_subscription_entitlements (is_active, expires_at desc);

create table if not exists public.search_access_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  request_type text not null default 'unknown'
    check (request_type in ('instagram_url', 'image_upload', 'unknown')),
  outcome text not null
    check (outcome in ('accepted', 'blocked')),
  reason text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists search_access_events_user_created_at_idx
  on public.search_access_events (user_id, created_at desc);

create index if not exists search_access_events_outcome_created_at_idx
  on public.search_access_events (outcome, created_at desc);

alter table public.user_search_access enable row level security;
alter table public.user_subscription_entitlements enable row level security;
alter table public.search_access_events enable row level security;

create policy "Users can view their own search access"
  on public.user_search_access
  for select
  using (auth.uid() = user_id);

create policy "Users can insert their own search access"
  on public.user_search_access
  for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own search access"
  on public.user_search_access
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete their own search access"
  on public.user_search_access
  for delete
  using (auth.uid() = user_id);

create policy "Users can view their own subscription entitlements"
  on public.user_subscription_entitlements
  for select
  using (auth.uid() = user_id);

create policy "Users can insert their own subscription entitlements"
  on public.user_subscription_entitlements
  for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own subscription entitlements"
  on public.user_subscription_entitlements
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete their own subscription entitlements"
  on public.user_subscription_entitlements
  for delete
  using (auth.uid() = user_id);

create policy "Users can view their own search access events"
  on public.search_access_events
  for select
  using (auth.uid() = user_id);

create policy "Users can insert their own search access events"
  on public.search_access_events
  for insert
  with check (auth.uid() = user_id);

create or replace function public.consume_search_access(
  p_user_id uuid,
  p_request_type text default 'unknown',
  p_metadata jsonb default '{}'::jsonb
)
returns table (
  free_searches_used integer,
  free_search_limit integer,
  has_active_subscription boolean,
  blocked boolean,
  block_reason text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_usage public.user_search_access%rowtype;
  v_entitlement public.user_subscription_entitlements%rowtype;
  v_request_type text := lower(coalesce(nullif(trim(p_request_type), ''), 'unknown'));
  v_has_active_subscription boolean := false;
begin
  if v_request_type not in ('instagram_url', 'image_upload', 'unknown') then
    raise exception 'invalid_request_type';
  end if;

  insert into public.user_search_access (user_id)
  values (p_user_id)
  on conflict (user_id) do nothing;

  select *
  into v_usage
  from public.user_search_access
  where user_id = p_user_id
  for update;

  select *
  into v_entitlement
  from public.user_subscription_entitlements
  where user_id = p_user_id;

  v_has_active_subscription := coalesce(v_entitlement.is_active, false)
    and coalesce(v_entitlement.status, 'inactive') in ('active', 'grace_period', 'billing_retry')
    and (v_entitlement.expires_at is null or v_entitlement.expires_at > now());

  if v_has_active_subscription then
    insert into public.search_access_events (user_id, request_type, outcome, reason, metadata)
    values (p_user_id, v_request_type, 'accepted', 'active_subscription', coalesce(p_metadata, '{}'::jsonb));

    return query
    select
      v_usage.free_searches_used,
      v_usage.free_search_limit,
      true,
      false,
      null::text;
    return;
  end if;

  update public.user_search_access
  set
    free_searches_used = v_usage.free_searches_used + 1,
    updated_at = now()
  where user_id = p_user_id
  returning *
  into v_usage;

  insert into public.search_access_events (user_id, request_type, outcome, reason, metadata)
  values (
    p_user_id,
    v_request_type,
    'accepted',
    case
      when v_usage.free_searches_used > v_usage.free_search_limit then 'signed_in_unlimited'
      else 'free_search_consumed'
    end,
    coalesce(p_metadata, '{}'::jsonb)
  );

  return query
  select
    v_usage.free_searches_used,
    v_usage.free_search_limit,
    false,
    false,
    null::text;
end;
$$;

revoke all on function public.consume_search_access(uuid, text, jsonb) from public;
revoke all on function public.consume_search_access(uuid, text, jsonb) from anon;
revoke all on function public.consume_search_access(uuid, text, jsonb) from authenticated;
