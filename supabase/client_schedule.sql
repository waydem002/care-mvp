-- Run once in Supabase → SQL Editor (project care-mvp).
-- Creates the weekly client list ("which clients are due on which weekday") and the
-- "not this week" exceptions, and fills a first draft from the real plan of 2–8 November.

create table if not exists public.client_schedule (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients(id) on delete cascade,
  weekday smallint not null check (weekday between 1 and 7), -- 1 = Monday … 7 = Sunday
  kind text not null default 'care' check (kind in ('care','cleaning')),
  visits_per_day smallint not null default 1 check (visits_per_day between 1 and 6),
  created_at timestamptz not null default now(),
  unique (patient_id, weekday, kind)
);

create table if not exists public.schedule_skips (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients(id) on delete cascade,
  week_start date not null,
  created_at timestamptz not null default now(),
  unique (patient_id, week_start)
);

alter table public.client_schedule enable row level security;
alter table public.schedule_skips enable row level security;

drop policy if exists "staff manage client_schedule" on public.client_schedule;
create policy "staff manage client_schedule" on public.client_schedule for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

drop policy if exists "staff manage schedule_skips" on public.schedule_skips;
create policy "staff manage schedule_skips" on public.schedule_skips for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

-- First draft from the plan of 2–8 November (hospital stays and evening visits left out).
insert into public.client_schedule (patient_id, weekday, kind, visits_per_day)
select v.patient_id, extract(isodow from v.visit_date)::int,
       case when 'reinigung' = any(v.tags) then 'cleaning' else 'care' end,
       count(*)
from public.visits v
where v.visit_date between '2026-11-02' and '2026-11-08'
  and not ('kkh' = any(v.tags)) and not ('abend' = any(v.tags))
group by 1, 2, 3
on conflict (patient_id, weekday, kind) do nothing;
