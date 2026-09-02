-- Care MVP — Module 1 schema (Medication Reminders + admin auth)
-- Run this in the Supabase SQL editor (or via `supabase db push`).

-- ---------------------------------------------------------------------
-- Profiles: extends Supabase auth.users with a role.
-- 'admin' and 'nurse' are supported now; 'family' is reserved for Module 3.
-- ---------------------------------------------------------------------
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  role text not null check (role in ('admin', 'nurse', 'family')) default 'admin',
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Patients
-- ---------------------------------------------------------------------
create table if not exists patients (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  date_of_birth date,
  pflegegrad smallint check (pflegegrad between 1 and 5),
  address text,
  phone text,
  notes text,
  active boolean not null default true,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Medications: one row per prescribed medication, with the daily times
-- it should be given, e.g. {'08:00','14:00','20:00'}.
-- ---------------------------------------------------------------------
create table if not exists medications (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references patients(id) on delete cascade,
  name text not null,
  dosage text,
  times time[] not null default '{}',
  active boolean not null default true,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Reminders: one row per scheduled dose on a given day.
-- Generated daily from `medications` by generate_daily_reminders().
-- ---------------------------------------------------------------------
create table if not exists reminders (
  id uuid primary key default gen_random_uuid(),
  medication_id uuid not null references medications(id) on delete cascade,
  patient_id uuid not null references patients(id) on delete cascade,
  scheduled_for timestamptz not null,
  status text not null check (status in ('pending', 'sent', 'confirmed', 'missed')) default 'pending',
  sent_at timestamptz,
  confirmed_at timestamptz,
  confirmed_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  unique (medication_id, scheduled_for)
);

create index if not exists reminders_scheduled_for_idx on reminders (scheduled_for);
create index if not exists reminders_status_idx on reminders (status);

-- ---------------------------------------------------------------------
-- Notifications: log of actual WhatsApp/SMS send attempts per reminder.
-- Kept separate from `reminders` so retries don't clobber reminder state.
-- ---------------------------------------------------------------------
create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  reminder_id uuid not null references reminders(id) on delete cascade,
  channel text not null check (channel in ('whatsapp', 'sms')),
  recipient_phone text,
  status text not null check (status in ('queued', 'sent', 'failed')) default 'queued',
  provider_message_id text,
  error text,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Reminder generation: call once a day (e.g. 00:05) to materialize
-- today's reminders from active medications. Safe to re-run — the
-- unique constraint on (medication_id, scheduled_for) prevents dupes.
-- ---------------------------------------------------------------------
create or replace function generate_daily_reminders(for_date date default current_date)
returns void
language plpgsql
security definer
as $$
begin
  insert into reminders (medication_id, patient_id, scheduled_for)
  select
    m.id,
    m.patient_id,
    (for_date + t)::timestamptz
  from medications m
  cross join unnest(m.times) as t
  join patients p on p.id = m.patient_id
  where m.active and p.active
  on conflict (medication_id, scheduled_for) do nothing;
end;
$$;

-- Mark anything still 'sent' more than 90 minutes past its scheduled time
-- as 'missed'. Call this periodically (e.g. every 15 min) alongside the
-- reminder-sending job.
create or replace function sweep_missed_reminders()
returns void
language sql
security definer
as $$
  update reminders
  set status = 'missed'
  where status in ('pending', 'sent')
    and scheduled_for < now() - interval '90 minutes';
$$;

-- ---------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------
alter table profiles enable row level security;
alter table patients enable row level security;
alter table medications enable row level security;
alter table reminders enable row level security;
alter table notifications enable row level security;

-- Any authenticated staff member (admin or nurse) can read/write.
-- Tighten this per-table later once nurse-specific restrictions are needed.
create policy "staff read profiles" on profiles for select
  using (auth.role() = 'authenticated');

create policy "staff manage patients" on patients for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

create policy "staff manage medications" on medications for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

create policy "staff manage reminders" on reminders for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

create policy "staff manage notifications" on notifications for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

-- Auto-create a profile row whenever a new auth user signs up.
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
as $$
begin
  insert into profiles (id, full_name, role)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', new.email), 'admin');
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ---------------------------------------------------------------------
-- Function hardening (per Supabase security advisor)
-- ---------------------------------------------------------------------
-- Pin search_path to prevent search_path hijacking on SECURITY DEFINER functions.
alter function generate_daily_reminders(date) set search_path = public;
alter function sweep_missed_reminders() set search_path = public;
alter function handle_new_user() set search_path = public;

-- Postgres grants EXECUTE to PUBLIC by default — revoke that, then grant
-- back only where the app actually needs it.
revoke execute on function generate_daily_reminders(date) from public;
revoke execute on function sweep_missed_reminders() from public;
revoke execute on function handle_new_user() from public;

-- Staff (logged-in) trigger reminder generation from the dashboard.
grant execute on function generate_daily_reminders(date) to authenticated;

-- sweep_missed_reminders and handle_new_user get no role grants at all:
-- the former only runs via the cron route's service-role client (which
-- bypasses grants), the latter only runs via its trigger.
