import Link from "next/link";
import { getStaffMembers, getTourDayStatusForWeek, getAbsences, getVisitsForWeek } from "@/lib/queries";
import { getWeekStart, getWeekDates, toDateKey } from "@/lib/calendar";
import GridCell from "@/components/GridCell";

const dayNames = ["MON", "DIE", "MIT", "DON", "FRI", "SAT", "SON"];
const absenceLabels: Record<string, string> = { urlaub: "Urlaub", krank: "Krank", frei: "FREI", sonstiges: "abwesend" };

export default async function WeekGridPage({ searchParams }: { searchParams: { week?: string } }) {
  const referenceDate = searchParams.week ? new Date(searchParams.week) : new Date();
  const weekStart = getWeekStart(referenceDate);
  const weekDates = getWeekDates(weekStart);
  const keys = weekDates.map((d) => toDateKey(d));

  const [staff, statuses, absences, visits] = await Promise.all([
    getStaffMembers(),
    getTourDayStatusForWeek(keys[0], keys[6]),
    getAbsences(keys[0], keys[6]),
    getVisitsForWeek(keys[0], keys[6]),
  ]);

  const rows = staff.filter((s) => s.active).sort((a, b) => a.full_name.localeCompare(b.full_name, "de"));
  const prev = new Date(weekStart);
  prev.setDate(prev.getDate() - 7);
  const next = new Date(weekStart);
  next.setDate(next.getDate() + 7);

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Who works when — week of {weekDates[0].toLocaleDateString("de-DE", { day: "numeric", month: "long" })}</h1>
          <p className="mt-1 text-sm text-muted">
            Click a cell to set FREI, FD, SD, Abend or Büro. Any carer can get any shift on any day. FREI replaces a shift. Holidays and sick days come from the Absences page.
          </p>
        </div>
        <div className="flex gap-2">
          <Link href={`/tours?week=${keys[0]}`} className="rounded-md border border-border px-3 py-2 text-sm text-ink hover:bg-paper">← Tours</Link>
          <Link href={`/tours/grid?week=${toDateKey(prev)}`} className="rounded-md border border-border px-3 py-2 text-sm text-ink hover:bg-paper">← Prev week</Link>
          <Link href={`/tours/grid?week=${toDateKey(next)}`} className="rounded-md border border-border px-3 py-2 text-sm text-ink hover:bg-paper">Next week →</Link>
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border border-border bg-surface">
        <table className="w-full min-w-[900px] table-fixed text-left text-sm">
          <thead>
            <tr className="border-b border-border bg-paper text-xs font-medium uppercase tracking-wide text-muted">
              <th className="w-32 px-3 py-3">Staff</th>
              {weekDates.map((d, i) => (
                <th key={i} className="px-2 py-3 text-center">
                  {dayNames[i]}
                  <div className="font-normal normal-case">{d.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" })}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((s) => (
              <tr key={s.id} className="border-b border-border last:border-0 align-top">
                <td className="px-3 py-2 font-medium text-ink">
                  {s.full_name}
                  {s.staff_type === "cleaning" && <div className="text-[11px] font-normal text-muted">Cleaning</div>}
                </td>
                {keys.map((k) => {
                  const active = statuses.filter((x) => x.staff_member_id === s.id && x.status_date === k).map((x) => x.status);
                  const ab = absences.find((a) => a.staff_member_id === s.id && a.start_date <= k && a.end_date >= k);
                  const count = visits.filter((v) => v.staff_member_id === s.id && v.visit_date === k).length;
                  return (
                    <td key={k} className="px-1 py-1.5">
                      <GridCell staffId={s.id} dateKey={k} active={active} absence={ab ? absenceLabels[ab.absence_type] : null} visitCount={count} />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
