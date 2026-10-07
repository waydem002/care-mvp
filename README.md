# Pflege Admin — Module 1 (Medication Reminders)

Admin dashboard for tracking patient medications and daily reminders. Built with Next.js 14 (App Router), Supabase, and Tailwind.

This is the first slice of the full plan: patient management, medication scheduling, and a reminder board with sent/confirmed/missed status. WhatsApp/SMS sending, the family portal, appointment requests, and the insurance calculator are not built yet — see "What's deliberately not here" below.

## 1. Set up Supabase

**This project's Supabase instance is already created and set up**, via the Supabase MCP connector:

- Project: `care-mvp`, org `PflegeDienst`, region `eu-central-1` (Frankfurt — EU data residency ✓)
- Dashboard: https://supabase.com/dashboard/project/uruhhesynlheyyfithlp
- Schema applied: all 5 tables (`profiles`, `patients`, `medications`, `reminders`, `notifications`), RLS enabled on all of them, both reminder functions created and hardened per the security advisor (pinned `search_path`, minimal `EXECUTE` grants)
- `.env.local` is already filled in with the real project URL and anon key

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
2. Add the env vars from `.env.example` in the Vercel project settings — including the WhatsApp ones once you have them; leave them blank to stay in dry-run mode.
3. `vercel.json` already defines three cron jobs:
   - `generate-reminders` — runs once daily to materialize that day's reminders from active medications.
   - `send-reminders` — runs every 5 minutes, sends due/consented reminders via WhatsApp (dry-run until real Meta credentials are set).
   - `sweep-missed` — runs every 15 minutes and flips anything left `pending`/`sent` more than 90 minutes past its scheduled time to `missed`.

   All three routes check the request's `Authorization` header against `CRON_SECRET`. Vercel Cron sends this automatically once the env var is set — no extra config needed.

**Timezone note**: `generate_daily_reminders` explicitly interprets medication times as Europe/Berlin local time (not UTC), so "08:00" entered on the Medications form means 8am in Germany, correctly converted to the right UTC instant for storage. This was a real bug in an earlier version — entered times were silently drifting by the UTC/CEST offset — fixed and verified against a live test patient on 2026-09-02.

## What's built now

- **Module 1 — Medication reminders**: patients, medications, daily reminder generation, status tracking (pending/sent/confirmed/missed), timezone-correct scheduling
- **Staff scheduling (Monthly Dienstplaner)**: a Staff page (roster management) and a Schedule page (real month-grid calendar, Monday-start) for assigning shifts. Shift types use German vocabulary (Frühdienst/Spätdienst/Nachtdienst/Bereitschaft/custom). Staff members are deliberately decoupled from login accounts (`profiles`) — someone can be on the roster without ever logging into the app. Verified against the live database with a multi-week test (shifts across three different dates, correctly grouped into the right month).
- **Weekly tour planning (Weekly Toureplaner)**: a Tours page — week view (Monday-start, prev/next navigation), grouped by day then by staff member, showing each person's ordered home-visit stops with patient name, address, estimated time, and status (planned/completed/cancelled). Sequencing is manual by design — real route optimization needs a mapping/routing API, a separate decision not to guess into existence. Verified: a two-stop route for one staff member, correct ordering, and confirmed the database itself rejects two stops claiming the same position (tested by deliberately trying to insert a duplicate — correctly failed).
- **Online booking (Online Terminbuchung)**: a public page at `/book` — no login required — where anyone can request a consultation, schedule change, extra visit, or callback. Staff review and approve/reject/complete requests on the `/requests` page. This is the first genuinely public write surface in the app, so it got extra security testing: confirmed an anonymous submission succeeds, confirmed that same anonymous visitor **cannot** read back their own or anyone else's request (`0` rows visible), and confirmed staff can see and manage everything normally. The public form deliberately does not show a dropdown of existing patients — that would leak the client list to anyone who visits the page — it takes a plain typed name instead, which staff can privately link to a real patient record later if relevant.
  - **Known gap, worth knowing about**: there's no spam/abuse protection (rate limiting, CAPTCHA) on the public form yet. Row Level Security correctly limits what a submitter can do (insert-only, no reading), but nothing yet stops someone from submitting the form many times in a row. Worth adding before this URL gets shared publicly at scale — options include Vercel's bot protection or a CAPTCHA service, neither wired up here.
- **Insurance calculator (Versicherungsrechner)**: a staff-facing tool (not public — built for use during onboarding conversations with families, per the original proposal) at `/insurance-calculator`. Enter a Pflegegrad and estimated care hours/rate, see live-calculated insurance coverage vs. client out-of-pocket cost. Rates (Pflegesachleistung, Pflegegeld, Entlastungsbetrag) are stored in an admin-editable database table, not hardcoded — because these figures are set by German law and periodically revised (last changed Jan 2025, next scheduled Jan 2028). Current figures were researched and cross-checked against multiple sources before building: Pflegesachleistung €796/1,497/1,859/2,299 for Pflegegrad 2–5, Entlastungsbetrag €131 for all grades including 1. Calculation logic verified against two scenarios (cost fully covered by budget, and cost exceeding budget) before shipping. Deliberately excludes Pflegegeld combination benefits, Verhinderungspflege, and Kurzzeitpflege — those involve genuinely complex proportional rules, and a wrong estimate on real household budgets is worse than clearly saying "not covered here." The calculator carries a visible disclaimer to that effect, and notes it isn't legal/financial advice.
- **Document search (RAG)**: a Documents page — add internal knowledge (policies, procedures, general notes, optionally linked to a patient), organized into freeform **folders** (e.g. "Finance", "HR", "Care Procedures" — type an existing one or create a new one), and search it back. **Supports PDF and .txt file upload**, not just pasted text: PDFs are automatically text-extracted (via `pdf-parse` v2 — note its API changed significantly from v1, documented in `lib/pdf.ts`) so they're searchable, and the original file stays downloadable via a signed URL (files live in a private Supabase Storage bucket, `authenticated`-only, same access pattern as everything else). Verified: PDF extraction tested against a real generated PDF before wiring it in; storage bucket, its RLS policy, and the new `documents` columns all confirmed live in the database. **Not verified from this environment**: an actual end-to-end file upload through the browser — that needs a real authenticated session, which only exists once the app is running locally. Test this yourself once it's up: add a document with a real PDF attached, confirm it appears searchable and downloadable.
  - Search runs in **text-fallback mode** right now (no `OPENAI_API_KEY` configured): plain keyword match instead of true semantic search, clearly labeled as such in the UI. Adding an OpenAI key upgrades it automatically, no code changes needed.
  - Max file size 10MB (configured in `next.config.mjs`). Scanned image-only PDFs (no real text layer) won't have extractable text — they'll still upload and be downloadable, just not searchable.

## ⚠️ Known risk worth addressing deliberately: Next.js version

While adding the PDF library, a routine `npm audit` surfaced something more important than the audit itself: **Vercel has stated Next.js 14.x will not receive further security patches** for vulnerabilities disclosed since May 2026 (middleware bypass, XSS, SSRF, cache poisoning, DoS — spread across the May, July, and August 2026 security releases). The only real fix is upgrading to Next.js 15.x or 16.x — a major-version migration, not a quick patch bump like the one done earlier in this project (14.2.15 → 14.2.35 for the December 2025 issue).

This wasn't fixed as part of today's work deliberately — a major version migration can involve breaking changes (async `cookies()`/`headers()`, caching defaults, routing behavior) across every page in the app, and doing it safely needs its own dedicated testing pass, not a rushed change alongside a feature build. Worth prioritizing before this app handles real client data in production, especially now that it has a genuine public-facing surface (`/book`).
- **WhatsApp reminder sending**: a cron route (`/api/cron/send-reminders`, every 5 minutes) that finds due reminders, checks the patient has active WhatsApp consent, sends via the Meta Cloud API, and logs the attempt — success or failure — to `notifications`. Verified against the live database: the due-reminder + consent-check query was tested directly, both for a consented patient (correctly selected) and a non-consented one (correctly skipped with a logged reason).
  - **Runs in dry-run mode until real Meta credentials exist.** Without `WHATSAPP_ACCESS_TOKEN`/`WHATSAPP_PHONE_NUMBER_ID` set, it does everything except the actual network call — logs a `queued` notification and leaves the reminder `pending` rather than falsely marking it `sent`. This means the whole pipeline is testable today, and swapping in real credentials later needs zero code changes.
  - **What only your friend can provide**: a WhatsApp Business Platform account through Meta Business Manager (requires business verification), a registered sending phone number, and — importantly — at least one **pre-approved message template**. Meta does not allow arbitrary free-text messages for business-initiated conversations like reminders; only approved templates can be sent outside a 24h customer-service window. The code assumes a template named `medication_reminder` (configurable via `WHATSAPP_TEMPLATE_NAME`) with four body variables in order: patient name, medication name, dosage, time. That template needs to be created and approved in Meta Business Manager before anything will actually send — this is usually the slowest step, worth starting early.
  - **To test it locally** once you have your service role key in `.env.local`: run `npm run dev`, then in another terminal: `curl -H "Authorization: Bearer <your CRON_SECRET>" http://localhost:3000/api/cron/send-reminders` — it'll report what it processed, in dry-run mode, without needing real WhatsApp credentials.
- **DSGVO/GDPR tooling** (Standard tier requirement):
  - **Audit log** — every change to patients/medications/reminders is captured automatically via a database trigger (who, what, when, and the full before/after state), visible per-patient on their detail page
  - **Consent tracking** — data-processing consent is required to add a patient; WhatsApp-communication consent is tracked separately and gates whether a reminder actually gets sent (see above)
  - **Data export** — "Export patient data" on the patient detail page downloads that patient's complete record (profile, medications, reminders, consents, audit history) as JSON — covers Art. 15/20 access and portability requests
  - **Deletion requests** — Art. 17 right to erasure as a reviewable workflow, not an instant delete: someone requests it with a reason, an admin completes or rejects it. Completing cascades the actual deletion; the request record itself stays as evidence the process was followed, and the audit log retains a snapshot of what was deleted (worth revisiting the exact retention period with legal counsel)

## What's deliberately not here yet

- **Patient/family self-confirmation** — only staff can currently mark reminders confirmed.
- **Family portal (Module 3)** and **patient-facing dashboard** — not started. The `profiles.role` field supports `'family'`, but RLS doesn't yet differentiate by role — everything authenticated currently has the same access. Worth tightening before family/patient logins exist.
- **Role-based access control enforcement** — `nurse` vs `admin` aren't currently differentiated at the database level, despite the schema supporting both.
- **Appointment requests, insurance calculator, emergency button, AI chatbot, competitive analysis** — not started.
- **Public marketing website (DE/EN)** — separate deliverable from this app; not addressed here.

## Manual dashboard step worth doing

Supabase flagged **leaked password protection** as disabled for this project (checks new passwords against known breach databases via HaveIBeenPwned). Not exposed via the MCP connector — enable it manually: Dashboard → Authentication → Policies/Providers → Password settings.

## Compliance notes carried over from planning

- Supabase should stay pinned to an EU region for the lifetime of the project.
- If/when WhatsApp is wired up, get a Data Processing Agreement with Meta and explicit consent flows in place first — many German care providers avoid WhatsApp for health-data messages entirely and use SMS or in-app notifications instead. Worth a quick legal check before committing either way.
- If the insurance calculator gets built later, keep its output framed as an estimate, not a guaranteed figure.
