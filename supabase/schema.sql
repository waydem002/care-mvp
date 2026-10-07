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
create or replace function generate_daily_reminders(
  for_date date default (now() at time zone 'Europe/Berlin')::date
)
returns void
language plpgsql
security definer
as $$
begin
  insert into reminders (medication_id, patient_id, scheduled_for)
  select
    m.id,
    m.patient_id,
    (for_date + t) at time zone 'Europe/Berlin'
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

-- ---------------------------------------------------------------------
-- Audit log: automatic, trigger-driven record of every change to
-- patients/medications/reminders. Staff can read it; nobody writes to
-- it directly — only the trigger does, via SECURITY DEFINER.
-- ---------------------------------------------------------------------
create table if not exists audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references profiles(id),
  action text not null,
  table_name text not null,
  record_id uuid not null,
  changes jsonb,
  created_at timestamptz not null default now()
);

create index if not exists audit_log_record_idx on audit_log (table_name, record_id);
create index if not exists audit_log_created_at_idx on audit_log (created_at);

create or replace function log_audit_event()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  actor uuid;
begin
  begin
    actor := auth.uid();
  exception when others then
    actor := null;
  end;

  if (tg_op = 'DELETE') then
    insert into audit_log (actor_id, action, table_name, record_id, changes)
    values (actor, tg_op, tg_table_name, old.id, to_jsonb(old));
    return old;
  else
    insert into audit_log (actor_id, action, table_name, record_id, changes)
    values (actor, tg_op, tg_table_name, new.id, to_jsonb(new));
    return new;
  end if;
end;
$$;

drop trigger if exists audit_patients on patients;
create trigger audit_patients after insert or update or delete on patients
  for each row execute function log_audit_event();

drop trigger if exists audit_medications on medications;
create trigger audit_medications after insert or update or delete on medications
  for each row execute function log_audit_event();

drop trigger if exists audit_reminders on reminders;
create trigger audit_reminders after insert or update or delete on reminders
  for each row execute function log_audit_event();

-- Only the trigger itself ever calls this — nobody should call it directly
-- via the REST RPC endpoint.
revoke execute on function log_audit_event() from public, anon, authenticated;

-- ---------------------------------------------------------------------
-- Consent tracking (Art. 6/7 DSGVO) — per patient, per purpose.
-- ---------------------------------------------------------------------
create table if not exists consents (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references patients(id) on delete cascade,
  consent_type text not null check (consent_type in ('data_processing', 'whatsapp_communication', 'family_portal_sharing')),
  granted boolean not null default true,
  granted_by uuid references profiles(id),
  granted_at timestamptz not null default now(),
  revoked_at timestamptz
);

create index if not exists consents_patient_idx on consents (patient_id);

-- ---------------------------------------------------------------------
-- Deletion requests (Art. 17 DSGVO — right to erasure). A workflow, not
-- an instant delete: someone requests it, an admin reviews and completes it,
-- and the request itself stays as evidence the process was followed.
-- ---------------------------------------------------------------------
create table if not exists deletion_requests (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references patients(id),
  requested_by uuid references profiles(id),
  requested_at timestamptz not null default now(),
  reason text,
  status text not null check (status in ('pending', 'completed', 'rejected')) default 'pending',
  completed_at timestamptz,
  completed_by uuid references profiles(id)
);

create index if not exists deletion_requests_status_idx on deletion_requests (status);

alter table audit_log enable row level security;
alter table consents enable row level security;
alter table deletion_requests enable row level security;

create policy "staff read audit log" on audit_log for select
  using (auth.role() = 'authenticated');

create policy "staff manage consents" on consents for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

create policy "staff manage deletion requests" on deletion_requests for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

-- ---------------------------------------------------------------------
-- Staff scheduling (Monthly Dienstplaner). Staff members are decoupled
-- from `profiles` — not everyone on the roster needs app login access.
-- ---------------------------------------------------------------------
create table if not exists staff_members (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  role text not null check (role in ('nurse', 'caregiver', 'driver', 'admin', 'other')) default 'caregiver',
  phone text,
  email text,
  profile_id uuid references profiles(id) on delete set null,
  active boolean not null default true,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now()
);

create index if not exists staff_members_active_idx on staff_members (active);

create table if not exists shifts (
  id uuid primary key default gen_random_uuid(),
  staff_member_id uuid not null references staff_members(id) on delete cascade,
  shift_date date not null,
  shift_type text not null check (shift_type in ('fruehdienst', 'spaetdienst', 'nachtdienst', 'bereitschaft', 'custom')) default 'fruehdienst',
  start_time time not null,
  end_time time not null,
  notes text,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now()
);

create index if not exists shifts_date_idx on shifts (shift_date);
create index if not exists shifts_staff_member_idx on shifts (staff_member_id);

alter table staff_members enable row level security;
alter table shifts enable row level security;

create policy "staff manage staff_members" on staff_members for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

create policy "staff manage shifts" on shifts for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

drop trigger if exists audit_staff_members on staff_members;
create trigger audit_staff_members after insert or update or delete on staff_members
  for each row execute function log_audit_event();

drop trigger if exists audit_shifts on shifts;
create trigger audit_shifts after insert or update or delete on shifts
  for each row execute function log_audit_event();

-- ---------------------------------------------------------------------
-- Weekly tour planning: ordered home-visit stops per staff member per
-- day. Sequencing is manual (admin sets sequence_order) — true route
-- optimization would need a mapping/routing API, a separate decision.
-- ---------------------------------------------------------------------
create table if not exists visits (
  id uuid primary key default gen_random_uuid(),
  staff_member_id uuid not null references staff_members(id) on delete cascade,
  patient_id uuid not null references patients(id) on delete cascade,
  visit_date date not null,
  sequence_order int not null default 1,
  scheduled_time time,
  duration_minutes int,
  visit_type text not null check (visit_type in ('care', 'medication', 'check_in', 'other')) default 'care',
  status text not null check (status in ('planned', 'completed', 'cancelled')) default 'planned',
  notes text,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  unique (staff_member_id, visit_date, sequence_order)
);

create index if not exists visits_date_idx on visits (visit_date);
create index if not exists visits_staff_member_idx on visits (staff_member_id);
create index if not exists visits_patient_idx on visits (patient_id);

alter table visits enable row level security;

create policy "staff manage visits" on visits for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

drop trigger if exists audit_visits on visits;
create trigger audit_visits after insert or update or delete on visits
  for each row execute function log_audit_event();

-- ---------------------------------------------------------------------
-- Online booking requests (Online Terminbuchung). The first genuinely
-- public write surface in the app — anonymous visitors can submit a
-- request without logging in, but can never read anything back.
-- patient_name is free text, not a foreign key: the public form must
-- never expose the existing patient list.
-- ---------------------------------------------------------------------
create table if not exists booking_requests (
  id uuid primary key default gen_random_uuid(),
  requester_name text not null,
  requester_phone text,
  requester_email text,
  patient_name text,
  request_type text not null check (request_type in ('consultation', 'schedule_change', 'extra_visit', 'callback', 'other')) default 'consultation',
  preferred_date date,
  preferred_time time,
  message text,
  status text not null check (status in ('pending', 'approved', 'rejected', 'completed')) default 'pending',
  admin_notes text,
  linked_patient_id uuid references patients(id) on delete set null,
  reviewed_by uuid references profiles(id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists booking_requests_status_idx on booking_requests (status);

alter table booking_requests enable row level security;

create policy "anyone can submit a booking request" on booking_requests
  for insert
  to anon
  with check (true);

create policy "staff manage booking requests" on booking_requests
  for all
  to authenticated
  using (true)
  with check (true);

drop trigger if exists audit_booking_requests on booking_requests;
create trigger audit_booking_requests after insert or update or delete on booking_requests
  for each row execute function log_audit_event();

-- ---------------------------------------------------------------------
-- Insurance calculator rates (Versicherungsrechner). Admin-editable
-- because these are set by German law (SGB XI) and change periodically.
-- Figures as of 2026 — unchanged since the Jan 2025 PUEG increase; next
-- scheduled legal adjustment is Jan 2028. Verify and update when that
-- happens, or sooner if the law changes unexpectedly.
--
-- Deliberately does NOT model Pflegegeld combination/proportional
-- benefits, Verhinderungspflege, Kurzzeitpflege, or Härtefall amounts —
-- only Pflegesachleistung and Entlastungsbetrag are calculated.
-- ---------------------------------------------------------------------
create table if not exists insurance_rates (
  id uuid primary key default gen_random_uuid(),
  pflegegrad smallint not null unique check (pflegegrad between 1 and 5),
  pflegesachleistung_monthly numeric(10,2) not null default 0,
  pflegegeld_monthly numeric(10,2) not null default 0,
  entlastungsbetrag_monthly numeric(10,2) not null default 131.00,
  effective_from date not null default current_date,
  notes text,
  updated_by uuid references profiles(id),
  updated_at timestamptz not null default now()
);

insert into insurance_rates (pflegegrad, pflegesachleistung_monthly, pflegegeld_monthly, entlastungsbetrag_monthly, effective_from, notes)
values
  (1, 0,    0,   131.00, '2025-01-01', 'PG1 has no regular Pflegesachleistung/Pflegegeld budget — only Entlastungsbetrag, Pflegehilfsmittel, and consultation.'),
  (2, 796,  347, 131.00, '2025-01-01', 'PUEG rates effective 2025-01-01, unchanged through 2026.'),
  (3, 1497, 599, 131.00, '2025-01-01', 'PUEG rates effective 2025-01-01, unchanged through 2026.'),
  (4, 1859, 800, 131.00, '2025-01-01', 'PUEG rates effective 2025-01-01, unchanged through 2026.'),
  (5, 2299, 990, 131.00, '2025-01-01', 'PUEG rates effective 2025-01-01, unchanged through 2026. Excludes Härtefall (hardship) amount of €2,488.')
on conflict (pflegegrad) do nothing;

alter table insurance_rates enable row level security;

create policy "staff manage insurance rates" on insurance_rates for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

drop trigger if exists audit_insurance_rates on insurance_rates;
create trigger audit_insurance_rates after insert or update or delete on insurance_rates
  for each row execute function log_audit_event();

-- ---------------------------------------------------------------------
-- Document folders + file storage. Folders are freeform text (admin
-- creates as many as needed). Files upload to a private Storage bucket;
-- PDFs get their text extracted automatically for search, the original
-- file stays downloadable via a signed URL.
-- ---------------------------------------------------------------------
alter table documents add column if not exists folder text not null default 'General';
alter table documents add column if not exists file_path text;
alter table documents add column if not exists file_name text;

create index if not exists documents_folder_idx on documents (folder);

insert into storage.buckets (id, name, public)
values ('documents', 'documents', false)
on conflict (id) do nothing;

create policy "staff manage documents bucket" on storage.objects
  for all
  to authenticated
  using (bucket_id = 'documents')
  with check (bucket_id = 'documents');

-- ---------------------------------------------------------------------
-- Document search (RAG). Internal knowledge — policies, procedures,
-- general notes — optionally linked to a patient, but nothing auto-
-- ingests patient records. See README for the embedding-provider note.
-- ---------------------------------------------------------------------
create extension if not exists vector;

create table if not exists documents (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  category text not null check (category in ('policy', 'procedure', 'general', 'patient_note')) default 'general',
  patient_id uuid references patients(id) on delete set null,
  content text not null,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now()
);

create index if not exists documents_patient_idx on documents (patient_id);

create table if not exists document_chunks (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references documents(id) on delete cascade,
  chunk_index int not null,
  content text not null,
  -- 1536 dims matches OpenAI text-embedding-3-small (see lib/embeddings.ts).
  embedding vector(1536),
  created_at timestamptz not null default now()
);

create index if not exists document_chunks_document_idx on document_chunks (document_id);
create index if not exists document_chunks_embedding_idx
  on document_chunks using hnsw (embedding vector_cosine_ops);

create or replace function match_document_chunks(query_embedding vector(1536), match_count int default 5)
returns table (
  chunk_id uuid,
  document_id uuid,
  document_title text,
  document_category text,
  content text,
  similarity float
)
language sql
stable
security definer
set search_path = public
as $$
  select
    dc.id as chunk_id,
    dc.document_id,
    d.title as document_title,
    d.category as document_category,
    dc.content,
    1 - (dc.embedding <=> query_embedding) as similarity
  from document_chunks dc
  join documents d on d.id = dc.document_id
  where dc.embedding is not null
  order by dc.embedding <=> query_embedding
  limit match_count;
$$;

alter table documents enable row level security;
alter table document_chunks enable row level security;

create policy "staff manage documents" on documents for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

create policy "staff manage document chunks" on document_chunks for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

revoke execute on function match_document_chunks(vector, int) from public, anon;
grant execute on function match_document_chunks(vector, int) to authenticated;

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
