import Link from "next/link";
import { getVisitsForWeek, getStaffMembers, getPatients } from "@/lib/queries";
import { getWeekStart, getWeekDates, toDateKey } from "@/lib/calendar";
import VisitForm from "@/components/VisitForm";
import VisitCard from "@/components/VisitCard";
import type { Visit } from "@/lib/types";

const weekdayNames = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

export default async function ToursPage({
  searchParams,
}: {
  searchParams: { week?: string };
}) {
  const referenceDate = searchParams.week ? new Date(searchParams.week) : new Date();
  const weekStart = getWeekStart(referenceDate);
  const weekDates = getWeekDates(weekStart);

  const startKey = toDateKey(weekDates[0]);
  const endKey = toDateKey(weekDates[6]);

  const [visits, staff, patients] = await Promise.all([
    getVisitsForWeek(startKey, endKey),
    getStaffMembers(),
    getPatients(),
  ]);

  const visitsByDay = new Map<string, Visit[]>();
  for (const visit of visits) {
    const key = visit.visit_date;
    if (!visitsByDay.has(key)) visitsByDay.set(key, []);
    visitsByDay.get(key)!.push(visit);
  }

  const prevWeek = new Date(weekStart);
  prevWeek.setDate(prevWeek.getDate() - 7);
  const nextWeek = new Date(weekStart);
  nextWeek.setDate(nextWeek.getDate() + 7);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-ink">
          Week of {weekDates[0].toLocaleDateString("de-DE", { day: "numeric", month: "long" })}
        </h1>
        <div className="flex gap-2">
          <Link
            href={`/tours?week=${toDateKey(prevWeek)}`}
            className="rounded-md border border-border px-3 py-1.5 text-sm text-ink hover:bg-paper"
          >
            ← Prev week
          </Link>
          <Link
            href={`/tours?week=${toDateKey(nextWeek)}`}
            className="rounded-md border border-border px-3 py-1.5 text-sm text-ink hover:bg-paper"
          >
            Next week →
          </Link>
        </div>
      </div>

      <div className="mb-8 space-y-4">
        {weekDates.map((day, i) => {
          const key = toDateKey(day);
          const dayVisits = visitsByDay.get(key) ?? [];

          const byStaff = new Map<string, Visit[]>();
          for (const v of dayVisits) {
            if (!byStaff.has(v.staff_name ?? "Unknown")) byStaff.set(v.staff_name ?? "Unknown", []);
            byStaff.get(v.staff_name ?? "Unknown")!.push(v);
          }

          return (
            <div key={key} className="overflow-hidden rounded-lg border border-border bg-surface">
              <div className="border-b border-border bg-paper px-4 py-2.5">
                <h2 className="text-sm font-semibold text-ink">
                  {weekdayNames[i]}, {day.toLocaleDateString("de-DE", { day: "numeric", month: "short" })}
                </h2>
              </div>
              {byStaff.size === 0 ? (
                <p className="px-4 py-6 text-center text-sm text-muted">No visits planned.</p>
              ) : (
                <div className="grid grid-cols-1 gap-3 p-4 md:grid-cols-2">
                  {Array.from(byStaff.entries()).map(([staffName, staffVisits]) => (
                    <div key={staffName}>
                      <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-muted">{staffName}</p>
                      <div className="space-y-1.5">
                        {staffVisits.map((v) => (
                          <VisitCard key={v.id} visit={v} />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <VisitForm staff={staff} patients={patients} />
    </div>
  );
}
