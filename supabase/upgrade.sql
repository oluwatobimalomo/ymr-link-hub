-- Run once for a project that already ran schema.sql before link-click totals were added.
create or replace function public.link_click_totals()
returns table(link_id uuid, click_count bigint)
language sql
stable
security definer
set search_path = ''
as $$
  select clicks.link_id, count(*)::bigint
  from public.link_clicks as clicks
  where public.is_link_hub_admin()
  group by clicks.link_id;
$$;

revoke all on function public.link_click_totals() from public;
grant execute on function public.link_click_totals() to authenticated;
