# Pflege Admin

A care-operations dashboard built with Next.js 14 App Router, Supabase, and Tailwind CSS. It brings together patient and medication management, reminders, staff scheduling, tour planning, public booking requests, an insurance estimate, and an internal document library.

## Current project status

The following features are implemented:

- **Patients and medication reminders** (`/patients`, `/reminders`, `/dashboard`): manage patient records and medications, generate daily reminders, and track pending, sent, confirmed, and missed doses. Medication times are interpreted in the `Europe/Berlin` timezone.
- **Staff and shift planning** (`/staff`, `/schedule`): maintain a staff roster independent of login accounts and assign shifts in a Monday-start month calendar.
- **Home-visit tours** (`/tours`): arrange dated patient visits by staff member, manually order stops, and track planned, completed, or cancelled visits. Route optimization is not included.
- **Public booking requests** (`/book`, `/requests`): visitors can submit a consultation, schedule-change, extra-visit, callback, or other request without an account. Staff can review requests and link them to a patient record when appropriate.
- **Insurance calculator** (`/insurance-calculator`): estimate coverage and client costs using editable monthly benefit rates. It is an estimate, not legal or financial advice, and does not model every German care-insurance benefit.
- **Internal documents and search** (`/documents`): organize knowledge by category and folder; paste text or upload PDF and `.txt` files. Text-based PDFs are extracted for search, and uploaded originals are held in a private Supabase Storage bucket. OpenAI embeddings enable semantic search when configured; otherwise search uses keyword matching. Scanned image-only PDFs have no searchable text. Upload limit: 10 MB.
- **WhatsApp medication reminders**: a scheduled sender checks WhatsApp consent, submits an approved Meta message template when credentials are configured, and records outcomes. Without WhatsApp credentials it runs in dry-run mode and sends no messages.
- **Privacy support on patient records**: record consent, view the audit trail, export patient data as JSON, and manage deletion requests through a review workflow.

The app is not a complete electronic health record or a guarantee of GDPR compliance. Review operational, privacy, and legal requirements before using it with real care data.

## Supabase setup

The existing project dashboard is at [supabase.com/dashboard/project/uruhhesynlheyyfithlp](https://supabase.com/dashboard/project/uruhhesynlheyyfithlp). Its primary database is configured in Frankfurt (`eu-central-1`). Verify the project and region before deploying or entering real data.

For a **new Supabase project**:

1. Create a project in an EU region appropriate for your data residency requirements.
2. In the SQL Editor, run [`supabase/schema.sql`](./supabase/schema.sql) once. It creates the application tables, RLS policies, database functions and triggers, document storage bucket, and insurance-rate seed data.
3. Enable Email authentication.
4. Add the first user from **Authentication → Users**. The database trigger creates a corresponding `profiles` record.
5. Copy the project URL and API keys from **Project Settings → API** into `.env.local` as described below.

Do not rerun the entire schema on an already-initialized project: policy and other DDL statements may already exist. Back up the database and use deliberate migrations when changing an existing deployment.

## Local development

Install dependencies and create `.env.local` from the example if you do not already have a local environment file:

```bash
npm install
cp .env.example .env.local
```

Set the variables in `.env.local`:

| Variable | Required | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase client authentication |
| `SUPABASE_SERVICE_ROLE_KEY` | For cron routes | Server-only Supabase access for scheduled reminder jobs; bypasses RLS |
| `CRON_SECRET` | For cron routes/deployment | Random secret used to authorize scheduled route requests |
| `WHATSAPP_ACCESS_TOKEN` | Optional | Meta WhatsApp Cloud API token; without it, sending is dry-run |
| `WHATSAPP_PHONE_NUMBER_ID` | Optional | Registered Meta WhatsApp sender ID |
| `WHATSAPP_TEMPLATE_NAME` | Optional | Approved template name; defaults to `medication_reminder` |
| `OPENAI_API_KEY` | Optional | Enables semantic document search; otherwise keyword search is used |

Never commit `.env.local`, service-role keys, or provider credentials. The service-role key must remain server-only.

Start the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and sign in with a user created in the Supabase project. The dashboard offers **Generate today's reminders**; reminder state can then be managed from the app.

Other useful commands:

```bash
npm run build
npm start
```

## Deployment and scheduled jobs

Import the repository into Vercel and configure the environment variables above in the project settings. Apply the Supabase schema before deploying. `vercel.json` configures these cron routes:

| Route | Schedule | Purpose |
| --- | --- | --- |
| `/api/cron/generate-reminders` | Daily at 00:05 UTC | Generate the day's reminder rows using the Europe/Berlin date |
| `/api/cron/send-reminders` | Every 5 minutes | Send due reminders when WhatsApp consent and credentials allow |
| `/api/cron/sweep-missed` | Every 15 minutes | Mark pending or sent reminders more than 90 minutes overdue as missed |

Each route requires `Authorization: Bearer <CRON_SECRET>`. Configure the same strong, random `CRON_SECRET` in Vercel so scheduled requests are authorized. The WhatsApp sender also needs a Meta Business Platform account, a registered number, and an approved message template. The configured template receives patient name, medication name, dosage, and scheduled time; review consent and applicable privacy requirements before enabling real sends.

## Access control and known gaps

- Protected application routes require a signed-in Supabase user. **Current RLS policies generally grant the same staff-level access to every authenticated user; `admin` and `nurse` roles are not yet enforced separately.** Do not enable unrestricted public sign-up. Create and manage accounts deliberately until role-based access is implemented.
- `/book` is intentionally public and permits anonymous request submission only; anonymous users cannot read booking requests. There is no rate limiting or CAPTCHA yet, so add abuse protection before promoting the public form broadly.
- There is no family portal, patient-facing dashboard, patient self-confirmation, SMS sender, route optimization, emergency button, AI chatbot, or public marketing site.
- The insurance calculator covers only the inputs and benefits implemented in the app. Verify rates and calculation assumptions with qualified sources before relying on estimates.
- Privacy features support operational workflows but do not replace a legal review, retention policy, backups, or a complete compliance program.
- The project currently uses Next.js 14.2.35. Review framework support and security updates before production use, and plan a tested upgrade as needed.

## Supabase Security Advisor

On 2026-10-07, the project's Security Advisor screenshot showed **0 errors and 6 warnings**:

1. The `vector` extension is installed in the `public` schema.
2. Two permissive-policy warnings on `public.booking_requests`: the anonymous insert policy intentionally allows public submissions; the authenticated staff policy allows any signed-in user to manage requests.
3. Signed-in users can execute the `SECURITY DEFINER` functions `generate_daily_reminders(date)` and `match_document_chunks(vector, int)`.
4. Leaked Password Protection is disabled in Supabase Auth.

These warnings are not automatically all defects: the public insert and authenticated function access support current app features. Reassess them if access requirements change, tighten permissions where appropriate, and enable leaked-password protection in the Supabase Auth password settings.
