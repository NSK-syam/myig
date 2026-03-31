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
