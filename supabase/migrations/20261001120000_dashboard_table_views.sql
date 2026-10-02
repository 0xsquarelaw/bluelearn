-- One row per member with their status and roles. The dashboard members and
-- roles tables page, filter and sort on these columns, and PostgREST cannot
-- filter or sort a top-level query by a column from another table.
create view public.dashboard_members with (security_invoker = on) as
select
  p.id,
  p.username,
  coalesce(p.display_name, p.username) as display_name,
  p.bio,
  p.created_at,
  p.updated_at,
  us.status,
  (
    select coalesce(array_agg(ur.role::text order by ur.role), '{}'::text[])
    from public.user_roles ur
    where ur.user_id = p.id
  ) as roles
from public.profiles p
left join public.user_statuses us on us.user_id = p.id;

grant select on public.dashboard_members to authenticated, service_role;

-- One row per assigned or completed review seat, flattened for the dashboard
-- assignments table for the same reason.
create view public.dashboard_assignments with (security_invoker = on) as
select
  pm.member_id,
  pm.panel_id,
  p.username,
  us.status as member_status,
  pm.status,
  pm.expires_at,
  rc.case_type,
  coalesce(gr.title, '') as title,
  coalesce(gr.change_summary, '') as change_summary,
  rc.created_at,
  rc.updated_at
from public.panel_members pm
join public.review_panels rp on rp.id = pm.panel_id
join public.review_cases rc on rc.id = rp.case_id
left join public.guide_review_cases grc on grc.case_id = rc.id
left join public.guide_revisions gr on gr.id = grc.guide_revision_id
left join public.profiles p on p.id = pm.member_id
left join public.user_statuses us on us.user_id = pm.member_id
where pm.status in ('assigned', 'completed');

grant select on public.dashboard_assignments to authenticated, service_role;
