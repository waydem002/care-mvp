# Pflege Admin — Module 1 (Medication Reminders)

Admin dashboard for tracking patient medications and daily reminders. Built with Next.js 14 (App Router), Supabase, and Tailwind.

This is the first slice of the full plan: patient management, medication scheduling, and a reminder board with sent/confirmed/missed status. WhatsApp/SMS sending, the family portal, appointment requests, and the insurance calculator are not built yet — see "What's deliberately not here" below.

## Mock visual

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│ Pflege Admin                                  Today · 02 Sep 2026        │
├──────────────────────────────────────────────────────────────────────────────┤
│ Patients                 │  Reminder board                                  │
│ ──────────────────────  │                                                 │
│ Anna Müller             │  08:00  Metformin     [Sent]   Confirmed        │
│ 72 · Diabetes           │  12:30  Vitamin D     [Pending] Mark sent      │
│ Meds: 3 active          │  18:00  Amlodipine   [Missed] Mark missed     │
│                        │                                                 │
│ Fritz Weber             │  Quick actions                                   │
│ 64 · Hypertension       │  Generate today's reminders                      │
│ Meds: 2 active          │  Add patient                                     │
│                        │                                                 │
│ + Add patient           │                                                 │
├──────────────────────────────────────────────────────────────────────────────┤
│ Sidebar: Dashboard | Patients | Reminders | Settings                         │
└──────────────────────────────────────────────────────────────────────────────┘
```

This mock shows the core workflow: manage patients, schedule medication reminders, and move each reminder through sent / confirmed / missed states from one admin dashboard.

## 1. Set up Supabase

**This project's Supabase instance is already created and set up**, via the Supabase MCP connector:

- Project: `care-mvp`, org `PflegeDienst`, region `eu-central-1` (Frankfurt — EU data residency ✓)
- Dashboard: https://supabase.com/dashboard/project/uruhhesynlheyyfithlp
- Schema applied: all 5 tables (`profiles`, `patients`, `medications`, `reminders`, `notifications`), RLS enabled on all of them, both reminder functions created and hardened per the security advisor (pinned `search_path`, minimal `EXECUTE` grants)
- Copy `.env.example` to `.env.local` and fill it with the project URL and keys

Two things still need doing manually in the dashboard (not exposed via the MCP connector, by design):

1. **Get the service role key**: Dashboard → this project → **Project Settings → API → service_role secret**. Paste it into `.env.local` as `SUPABASE_SERVICE_ROLE_KEY`. This key bypasses RLS entirely — never commit it or expose it to the browser.
2. **Create your first admin login**: Dashboard → **Authentication → Users → Add user**. Create one with your email + a password. The `handle_new_user` trigger fires automatically and creates their `profiles` row with `role = 'admin'` — nothing else needed.

If you're setting this up somewhere else from scratch instead (a new project, a different Supabase account), the general steps are:
1. Create a project at [supabase.com](https://supabase.com) — **choose an EU region** for GDPR data residency.
2. In the SQL editor, run the contents of `supabase/schema.sql`.
3. In **Authentication → Providers**, make sure Email is enabled.
4. In **Authentication → Users**, manually create your first admin user.
5. Grab your keys from **Project Settings → API**.

## 2. Run locally

```bash
npm install
cp .env.example .env.local
# fill in .env.local with your Supabase URL + keys
npm run dev
```

Visit `http://localhost:3000`, sign in with the admin user you created, then:
1. Go to **Patients** → add a patient.
2. Click into the patient → add a medication with reminder times (e.g. `08:00, 14:00, 20:00`).
3. Go to **Today** → click **Generate today's reminders**. This calls the `generate_daily_reminders` SQL function, which creates a reminder row for every active medication time today.
4. Use **Mark sent / Confirm taken / Mark missed** on each row to move it through its lifecycle.

## 3. Deploy to Vercel

1. Push this to a GitHub repo, then import it in Vercel.
2. Add the four env vars from `.env.example` in the Vercel project settings.
3. `vercel.json` already defines two cron jobs:
   - `generate-reminders` — runs once daily to materialize that day's reminders from active medications.
   - `sweep-missed` — runs every 15 minutes and flips anything left `pending`/`sent` more than 90 minutes past its scheduled time to `missed`.

   Both routes check the request's `Authorization` header against `CRON_SECRET`. Vercel Cron sends this automatically once the env var is set — no extra config needed.

**Known limitation to fix before real deployment**: the cron schedule in `vercel.json` runs in UTC (`5 0 * * *` = 00:05 UTC), and the SQL function uses the Postgres server's `current_date`, which is also UTC by default. That's roughly 1–2 hours off from German local midnight depending on daylight saving. Before going live, either set the Postgres session timezone to `Europe/Berlin` in the function, or adjust the cron schedule to `5 22 * * *` (22:05 UTC ≈ 00:05 CET) and revisit around DST changes.

## What's deliberately not here yet

- **WhatsApp/SMS sending** — the `notifications` table and "Mark sent" action are ready to wire up to a provider, but no actual message gets sent yet. Worth resolving the WhatsApp-vs-GDPR question (see below) before building this.
- **Patient/family self-confirmation** — right now only staff mark reminders as confirmed. Whether patients can self-confirm is a UX question worth testing with real patients first.
- **Family portal (Module 3)** — the `profiles.role` field already supports a `'family'` role and RLS is structured to extend to it, but there's no family-facing UI or read-only data scoping yet.
- **Appointment requests (Module 4)** and **insurance calculator (Module 5)** — not started, per the earlier scoping discussion.

## Compliance notes carried over from planning

- Supabase should stay pinned to an EU region for the lifetime of the project.
- If/when WhatsApp is wired up, get a Data Processing Agreement with Meta and explicit consent flows in place first — many German care providers avoid WhatsApp for health-data messages entirely and use SMS or in-app notifications instead. Worth a quick legal check before committing either way.
- If the insurance calculator gets built later, keep its output framed as an estimate, not a guaranteed figure.
