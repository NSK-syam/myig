create table if not exists public.guest_search_access (
  guest_id uuid primary key,
  free_searches_used integer not null default 0 check (free_searches_used >= 0),
  free_search_limit integer not null default 3 check (free_search_limit > 0),
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.guest_search_access enable row level security;

create or replace function public.consume_guest_search_access(
  p_guest_id uuid,
  p_request_type text default 'unknown',
  p_metadata jsonb default '{}'::jsonb
)
returns table (
  free_searches_used integer,
  free_search_limit integer,
  blocked boolean,
  block_reason text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_usage public.guest_search_access%rowtype;
  v_request_type text := lower(coalesce(nullif(trim(p_request_type), ''), 'unknown'));
begin
  if v_request_type not in ('instagram_url', 'image_upload', 'unknown') then
    raise exception 'invalid_request_type';
  end if;

  insert into public.guest_search_access (guest_id)
  values (p_guest_id)
  on conflict (guest_id) do nothing;

  select *
  into v_usage
  from public.guest_search_access
  where guest_id = p_guest_id
  for update;

  if v_usage.free_searches_used >= v_usage.free_search_limit then
    update public.guest_search_access
    set
      last_seen_at = now(),
      updated_at = now()
    where guest_id = p_guest_id;

    return query
    select
      v_usage.free_searches_used,
      v_usage.free_search_limit,
      true,
      'guest_search_limit_reached'::text;
    return;
  end if;

  update public.guest_search_access
  set
    free_searches_used = v_usage.free_searches_used + 1,
    last_seen_at = now(),
    updated_at = now()
  where guest_id = p_guest_id
  returning *
  into v_usage;

  return query
  select
    v_usage.free_searches_used,
    v_usage.free_search_limit,
    false,
    null::text;
end;
$$;

revoke all on function public.consume_guest_search_access(uuid, text, jsonb) from public;
revoke all on function public.consume_guest_search_access(uuid, text, jsonb) from anon;
revoke all on function public.consume_guest_search_access(uuid, text, jsonb) from authenticated;
