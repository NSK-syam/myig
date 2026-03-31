alter table public.user_search_access
  alter column free_search_limit set default 7;

update public.user_search_access
set
  free_search_limit = 7,
  updated_at = now()
where free_search_limit <> 7;
