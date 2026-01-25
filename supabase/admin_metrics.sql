-- Admin/event tables + metrics RPC for Supabase

-- Extensions
create extension if not exists pgcrypto;

-- Admin user registry
create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade
);

-- Insert admin user (run with service role)
insert into public.admin_users (user_id)
select id
from auth.users
where email = 'admin@muruai.com'
on conflict do nothing;

alter table public.admin_users enable row level security;

drop policy if exists "admin_users_self" on public.admin_users;
create policy "admin_users_self"
  on public.admin_users
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Activity events
create table if not exists public.activity_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id),
  event_type text not null,
  created_at timestamptz not null default now()
);
create index if not exists activity_events_created_at_idx
  on public.activity_events (created_at);
create index if not exists activity_events_user_id_idx
  on public.activity_events (user_id);
create index if not exists activity_events_event_type_idx
  on public.activity_events (event_type);

alter table public.activity_events enable row level security;

drop policy if exists "activity_events_insert_own" on public.activity_events;
create policy "activity_events_insert_own"
  on public.activity_events
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "activity_events_select_admin" on public.activity_events;
create policy "activity_events_select_admin"
  on public.activity_events
  for select
  using (exists (
    select 1 from public.admin_users au where au.user_id = auth.uid()
  ));

-- Download events
create table if not exists public.download_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id),
  user_made_id uuid references public.user_made_n(id),
  created_at timestamptz not null default now()
);
create index if not exists download_events_created_at_idx
  on public.download_events (created_at);
create index if not exists download_events_user_id_idx
  on public.download_events (user_id);
create index if not exists download_events_user_made_id_idx
  on public.download_events (user_made_id);

alter table public.download_events enable row level security;

drop policy if exists "download_events_insert_own" on public.download_events;
create policy "download_events_insert_own"
  on public.download_events
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "download_events_select_admin" on public.download_events;
create policy "download_events_select_admin"
  on public.download_events
  for select
  using (exists (
    select 1 from public.admin_users au where au.user_id = auth.uid()
  ));

-- Template usage events (optional)
create table if not exists public.template_usage_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id),
  user_made_id uuid references public.user_made_n(id),
  template_id text not null,
  created_at timestamptz not null default now()
);
create index if not exists template_usage_events_created_at_idx
  on public.template_usage_events (created_at);
create index if not exists template_usage_events_user_id_idx
  on public.template_usage_events (user_id);
create index if not exists template_usage_events_template_id_idx
  on public.template_usage_events (template_id);

alter table public.template_usage_events enable row level security;

drop policy if exists "template_usage_events_insert_own" on public.template_usage_events;
create policy "template_usage_events_insert_own"
  on public.template_usage_events
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "template_usage_events_select_admin" on public.template_usage_events;
create policy "template_usage_events_select_admin"
  on public.template_usage_events
  for select
  using (exists (
    select 1 from public.admin_users au where au.user_id = auth.uid()
  ));

-- Admin metrics RPC
create or replace function public.admin_dashboard_metrics(
  start_date date,
  end_date date
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  is_admin boolean;
  excluded_users uuid[] := array[
    '7745695c-0882-4a84-bc4c-56c036db2d5c',
    'a0578f6e-5b20-4739-b88a-f07815d29da5',
    '95b31837-5a6b-4283-8163-bae364a4eb35',
    'ac78fa14-651a-493e-bc8a-bd0849d52e21',
    'aa7bdcdd-76c7-4bb5-bbb6-1e59df247940',
    '384cbd1f-7fd8-4e3c-89f5-cba96b01cecb',
    'faf78983-1657-4357-a7bc-5d5005972479'
  ];
  activity_has_data boolean := false;
  download_has_data boolean := false;
  start_ts timestamptz := start_date::timestamptz;
  end_ts timestamptz := (end_date::timestamptz + interval '1 day' - interval '1 millisecond');
  total_created integer := 0;
  total_downloads integer := 0;
  total_active integer := 0;
  total_download_users integer := 0;
  template_docs integer := 0;
  weekly_visit_avg numeric := null;
  trend jsonb := '[]'::jsonb;
  weekly_dist jsonb := '[]'::jsonb;
  weekday_dist jsonb := '[]'::jsonb;
  daily_visits jsonb := '[]'::jsonb;
  top_templates jsonb := '[]'::jsonb;
  user_docs jsonb := '[]'::jsonb;
begin
  select exists(
    select 1 from public.admin_users au where au.user_id = auth.uid()
  ) into is_admin;

  if not is_admin then
    raise exception 'not authorized';
  end if;

  select exists (
    select 1 from public.activity_events
    where created_at >= start_ts and created_at <= end_ts
      and event_type in ('login', 'session_start', 'active')
      and user_id <> all (excluded_users)
  ) into activity_has_data;

  select exists (
    select 1 from public.download_events
    where created_at >= start_ts and created_at <= end_ts
      and user_id <> all (excluded_users)
      and not exists (
        select 1 from public.user_made_n um
        where um.id = public.download_events.user_made_id
          and um.user_id = any (excluded_users)
      )
  ) into download_has_data;

  select count(*) into total_created
  from public.user_made_n
  where created_at >= start_ts and created_at <= end_ts
    and user_id <> all (excluded_users);

  select count(*) into total_downloads
  from public.download_events
  where created_at >= start_ts and created_at <= end_ts
    and user_id <> all (excluded_users)
    and not exists (
      select 1 from public.user_made_n um
      where um.id = public.download_events.user_made_id
        and um.user_id = any (excluded_users)
    );

  select count(distinct user_id) into total_active
  from public.activity_events
  where created_at >= start_ts and created_at <= end_ts
    and event_type in ('login', 'session_start', 'active')
    and user_id <> all (excluded_users);

  select count(distinct user_id) into total_download_users
  from public.download_events
  where created_at >= start_ts and created_at <= end_ts
    and user_id <> all (excluded_users)
    and not exists (
      select 1 from public.user_made_n um
      where um.id = public.download_events.user_made_id
        and um.user_id = any (excluded_users)
    );

  with template_base as (
    select template_id, user_made_id
    from public.template_usage_events
    where created_at >= start_ts and created_at <= end_ts
      and user_id <> all (excluded_users)
      and not exists (
        select 1 from public.user_made_n um
        where um.id = public.template_usage_events.user_made_id
          and um.user_id = any (excluded_users)
      )
  ),
  template_stats as (
    select template_id,
           count(*) as usage_count,
           count(distinct user_made_id) as doc_count
    from template_base
    group by template_id
  ),
  template_docs_cte as (
    select count(distinct user_made_id) as count
    from template_base
  )
  select coalesce(
           jsonb_agg(
             jsonb_build_object(
               'template_id', stats.template_id,
               'usage_count', stats.usage_count,
               'doc_count', stats.doc_count
             )
             order by stats.usage_count desc, stats.doc_count desc
           ),
           '[]'::jsonb
         ),
         coalesce((select count from template_docs_cte), 0)
  into top_templates, template_docs
  from (
    select * from template_stats
    order by usage_count desc, doc_count desc
    limit 5
  ) stats;

  with days as (
    select generate_series(start_date, end_date, interval '1 day')::date as day
  ),
  activity_daily as (
    select created_at::date as day, count(distinct user_id) as count
    from public.activity_events
    where created_at >= start_ts and created_at <= end_ts
      and event_type in ('login', 'session_start')
      and user_id <> all (excluded_users)
    group by created_at::date
  ),
  created_daily as (
    select created_at::date as day, count(*) as count
    from public.user_made_n
    where created_at >= start_ts and created_at <= end_ts
      and user_id <> all (excluded_users)
    group by created_at::date
  ),
  download_daily as (
    select created_at::date as day, count(*) as count
    from public.download_events
    where created_at >= start_ts and created_at <= end_ts
      and user_id <> all (excluded_users)
      and not exists (
        select 1 from public.user_made_n um
        where um.id = public.download_events.user_made_id
          and um.user_id = any (excluded_users)
      )
    group by created_at::date
  )
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'date', days.day::text,
        'created', coalesce(created_daily.count, 0),
        'downloads', coalesce(download_daily.count, 0)
      )
      order by days.day
    ),
    '[]'::jsonb
  )
  into trend
  from days
  left join created_daily on created_daily.day = days.day
  left join download_daily on download_daily.day = days.day;

  with days as (
    select generate_series(start_date, end_date, interval '1 day')::date as day
  ),
  activity_daily as (
    select created_at::date as day, count(distinct user_id) as count
    from public.activity_events
    where created_at >= start_ts and created_at <= end_ts
      and event_type in ('login', 'session_start')
      and user_id <> all (excluded_users)
    group by created_at::date
  )
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'date', days.day::text,
        'count', coalesce(activity_daily.count, 0)
      )
      order by days.day
    ),
    '[]'::jsonb
  )
  into daily_visits
  from days
  left join activity_daily on activity_daily.day = days.day;

  with per_user as (
    select user_id, count(distinct created_at::date) as visit_count
    from public.activity_events
    where created_at >= start_ts and created_at <= end_ts
      and event_type in ('login', 'session_start')
      and user_id <> all (excluded_users)
    group by user_id
  ),
  buckets as (
    select
      case
        when visit_count = 1 then '1'
        when visit_count = 2 then '2'
        when visit_count between 3 and 4 then '3-4'
        when visit_count between 5 and 7 then '5-7'
        else '8+'
      end as label,
      case
        when visit_count = 1 then 1
        when visit_count = 2 then 2
        when visit_count between 3 and 4 then 3
        when visit_count between 5 and 7 then 4
        else 5
      end as bucket_order,
      count(*) as count
    from per_user
    group by label, bucket_order
  ),
  totals as (
    select sum(count) as total from buckets
  )
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'label', buckets.label,
        'count', buckets.count,
        'ratio', case when totals.total = 0 then 0 else buckets.count::numeric / totals.total end
      )
      order by buckets.bucket_order
    ),
    '[]'::jsonb
  )
  into weekly_dist
  from buckets
  cross join totals;

  select avg(visit_days)::numeric into weekly_visit_avg
  from (
    select count(distinct created_at::date) as visit_days
    from public.activity_events
    where created_at >= start_ts and created_at <= end_ts
      and event_type in ('login', 'session_start')
      and user_id <> all (excluded_users)
    group by user_id
  ) visit_counts;

  with weekday_labels as (
    select 0 as dow, '일' as label union all
    select 1 as dow, '월' as label union all
    select 2 as dow, '화' as label union all
    select 3 as dow, '수' as label union all
    select 4 as dow, '목' as label union all
    select 5 as dow, '금' as label union all
    select 6 as dow, '토' as label
  ),
  weekday_counts as (
    select extract(dow from created_at)::int as dow,
           count(distinct user_id) as count
    from public.activity_events
    where created_at >= start_ts and created_at <= end_ts
      and event_type in ('login', 'session_start')
      and user_id <> all (excluded_users)
    group by extract(dow from created_at)::int
  )
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'label', weekday_labels.label,
        'count', coalesce(weekday_counts.count, 0),
        'ratio', 0
      )
      order by weekday_labels.dow
    ),
    '[]'::jsonb
  )
  into weekday_dist
  from weekday_labels
  left join weekday_counts on weekday_counts.dow = weekday_labels.dow;

  with per_user as (
    select
      um.user_id,
      coalesce(au.raw_user_meta_data->>'name', au.email, um.user_id::text) as user_name,
      count(*) as total
    from public.user_made_n um
    left join auth.users au on au.id = um.user_id
    where um.created_at >= start_ts and um.created_at <= end_ts
      and um.user_id <> all (excluded_users)
    group by um.user_id, user_name
  ),
  top_users as (
    select * from per_user
    order by total desc
    limit 5
  ),
  docs_ranked as (
    select
      um.user_id,
      jsonb_build_object(
        'id', um.id,
        'name', um.name,
        'created_at', um.created_at
      ) as doc,
      row_number() over (partition by um.user_id order by um.created_at desc) as rn
    from public.user_made_n um
    where um.created_at >= start_ts and um.created_at <= end_ts
      and um.user_id <> all (excluded_users)
  ),
  docs_limited as (
    select user_id, jsonb_agg(doc order by (doc->>'created_at') desc) as docs
    from docs_ranked
    where rn <= 3
    group by user_id
  )
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'user_id', top_users.user_id,
        'user_name', top_users.user_name,
        'total', top_users.total,
        'docs', coalesce(docs_limited.docs, '[]'::jsonb)
      )
      order by top_users.total desc
    ),
    '[]'::jsonb
  )
  into user_docs
  from top_users
  left join docs_limited on docs_limited.user_id = top_users.user_id;

  return jsonb_build_object(
    'documents', jsonb_build_object(
      'total_created', total_created
    ),
    'templates', jsonb_build_object(
      'template_docs', template_docs,
      'top_templates', top_templates
    ),
    'activity', jsonb_build_object(
      'wau', total_active,
      'active_users', total_active,
      'has_data', activity_has_data,
      'weekly_visit_avg', weekly_visit_avg,
      'weekly_visit_distribution', weekly_dist,
      'weekday_visits', weekday_dist,
      'daily_visits', daily_visits
    ),
    'downloads', jsonb_build_object(
      'total', total_downloads,
      'users', total_download_users,
      'has_data', download_has_data,
      'conversion_rate', case when total_created = 0 then null else total_downloads::numeric / total_created end,
      'user_ratio', case when total_active = 0 then null else total_download_users::numeric / total_active end
    ),
    'trend', trend,
    'user_docs', user_docs
  );
end;
$$;

grant execute on function public.admin_dashboard_metrics(date, date) to authenticated;

create or replace function public.admin_user_names(user_ids uuid[])
returns table(user_id uuid, user_name text)
language sql
security definer
set search_path = public
as $$
  select
    u.id as user_id,
    coalesce(u.raw_user_meta_data->>'name', u.email, u.id::text) as user_name
  from auth.users u
  where u.id = any(user_ids)
    and exists (
      select 1 from public.admin_users au where au.user_id = auth.uid()
    );
$$;

grant execute on function public.admin_user_names(uuid[]) to authenticated;

-- Admin user docs overview (user list)
create or replace function public.admin_user_docs_overview()
returns table(user_id uuid, user_name text, total integer, latest_created_at timestamptz)
language plpgsql
security definer
set search_path = public
as $$
declare
  excluded_users uuid[] := array[
    '7745695c-0882-4a84-bc4c-56c036db2d5c',
    'a0578f6e-5b20-4739-b88a-f07815d29da5',
    '95b31837-5a6b-4283-8163-bae364a4eb35',
    'ac78fa14-651a-493e-bc8a-bd0849d52e21',
    'aa7bdcdd-76c7-4bb5-bbb6-1e59df247940',
    '384cbd1f-7fd8-4e3c-89f5-cba96b01cecb',
    'faf78983-1657-4357-a7bc-5d5005972479'
  ];
begin
  if not exists (
    select 1 from public.admin_users au where au.user_id = auth.uid()
  ) then
    raise exception 'not authorized';
  end if;

  return query
  select
    um.user_id,
    coalesce(au.raw_user_meta_data->>'name', au.email, um.user_id::text) as user_name,
    count(*)::int as total,
    max(um.created_at) as latest_created_at
  from public.user_made_n um
  left join auth.users au on au.id = um.user_id
  where um.user_id <> all (excluded_users)
  group by um.user_id, user_name
  order by latest_created_at desc;
end;
$$;

grant execute on function public.admin_user_docs_overview() to authenticated;

-- Admin user docs list (paged)
create or replace function public.admin_user_docs_for_user(
  target_user_id uuid,
  limit_count int default 30,
  offset_count int default 0
)
returns table(
  id uuid,
  user_id uuid,
  name text,
  created_at timestamptz,
  canvas_data jsonb,
  targets jsonb
)
language plpgsql
security definer
set search_path = public
as $$
declare
  excluded_users uuid[] := array[
    '7745695c-0882-4a84-bc4c-56c036db2d5c',
    'a0578f6e-5b20-4739-b88a-f07815d29da5',
    '95b31837-5a6b-4283-8163-bae364a4eb35',
    'ac78fa14-651a-493e-bc8a-bd0849d52e21',
    'aa7bdcdd-76c7-4bb5-bbb6-1e59df247940',
    '384cbd1f-7fd8-4e3c-89f5-cba96b01cecb',
    'faf78983-1657-4357-a7bc-5d5005972479'
  ];
begin
  if not exists (
    select 1 from public.admin_users au where au.user_id = auth.uid()
  ) then
    raise exception 'not authorized';
  end if;

  if target_user_id = any (excluded_users) then
    return;
  end if;

  return query
  with base_docs as (
    select um.id, um.user_id, um.name, um.created_at, um.canvas_data
    from public.user_made_n um
    where um.user_id = target_user_id
      and um.user_id <> all (excluded_users)
    order by um.created_at desc
    limit limit_count
    offset offset_count
  ),
  targets as (
    select
      t.user_made_id,
      jsonb_agg(
        distinct jsonb_build_object(
          'type', case when t.child_id is not null then 'child' else 'group' end,
          'id', coalesce(t.child_id, t.group_id)::text,
          'name', coalesce(s.name, g.name, case when t.child_id is not null then '아동' else '그룹' end)
        )
      ) as targets
    from public.user_made_targets_n t
    left join public.students_n s on s.id = t.child_id
    left join public.groups_n g on g.id = t.group_id
    where t.user_made_id in (select base_docs.id from base_docs)
    group by t.user_made_id
  )
  select
    b.id,
    b.user_id,
    b.name,
    b.created_at,
    b.canvas_data,
    coalesce(targets.targets, '[]'::jsonb) as targets
  from base_docs b
  left join targets on targets.user_made_id = b.id
  order by b.created_at desc;
end;
$$;

grant execute on function public.admin_user_docs_for_user(uuid, int, int) to authenticated;

create index if not exists user_made_n_user_id_created_at_idx
  on public.user_made_n (user_id, created_at desc);

create index if not exists user_made_targets_user_made_id_idx
  on public.user_made_targets_n (user_made_id);
