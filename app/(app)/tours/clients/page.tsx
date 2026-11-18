import Link from "next/link";
import { getClientSchedule, getPatients } from "@/lib/queries";
import ScheduleCell from "@/components/ScheduleCell";

const days = ["MON", "DIE", "MIT", "DON", "FRI", "SAM", "SON"];

export default async function ClientSchedulePage() {
  const [{ rows, tableMissing }, patients] = await Promise.all([getClientSchedule(), getPatients()]);
  const sorted = [...patients].sort((a, b) => a.full_name.localeCompare(b.full_name, "de"));
  const value = (pid: string, wd: number, kind: "care" | "cleaning") =>
    rows.find((r) => r.patient_id === pid && r.weekday === wd && r.kind === kind)?.visits_per_day ?? 0;

  const section = (kind: "care" | "cleaning", title: string, max: number) => {
    const list = sorted.filter((p) => kind === "care" || rows.some((r) => r.patient_id === p.id && r.kind === "cleaning"));
    return (
      <div className="mb-8">
        <h2 className="mb-2 text-base font-semibold text-ink">{title}</h2>
        <div className="overflow-x-auto rounded-lg border border-border bg-surface">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead>
              <tr className="border-b border-border bg-paper text-xs font-medium uppercase tracking-wide text-muted">
                <th className="px-3 py-2.5">Client</th>
                {days.map((d) => (<th key={d} className="w-20 px-2 py-2.5 text-center">{d}</th>))}
              </tr>
            </thead>
            <tbody>
              {list.map((p) => (
                <tr key={p.id} className="border-b border-border last:border-0">
                  <td className="px-3 py-1.5 font-medium text-ink">{p.full_name}</td>
                  {days.map((_, i) => (
                    <td key={i} className="px-1.5 py-1">
                      <ScheduleCell patientId={p.id} weekday={i + 1} kind={kind} value={value(p.id, i + 1, kind)} max={max} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Client weekly list</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted">
            For every client: how many visits are due on each weekday. The Tours page uses this to show who is still without a visit and to filter the clients when you add visits.
            Draft filled from the plan of 2–8 November; please correct it.
          </p>
        </div>
        <Link href="/tours" className="rounded-md border border-border px-3 py-2 text-sm text-ink hover:bg-paper">← Tours</Link>
      </div>

      {tableMissing && (
        <div className="mb-6 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-ink">
          The client list is not set up in the database yet. Run the file <code>supabase/client_schedule.sql</code> once in the Supabase SQL Editor, then reload this page.
        </div>
      )}

      {section("care", "Care visits (number of visits per day)", 3)}
      {section("cleaning", "Cleaning (Carmen)", 1)}
    </div>
  );
}
