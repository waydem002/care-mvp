import Link from "next/link";
import { getShiftsForMonth, getStaffMembers } from "@/lib/queries";
import { getMonthGrid, toDateKey } from "@/lib/calendar";
import ShiftForm from "@/components/ShiftForm";
import ShiftBadge from "@/components/ShiftBadge";

const monthNames = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const weekdayLabels = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];

export default async function SchedulePage({
  searchParams,
}: {
  searchParams: { year?: string; month?: string };
}) {
  const now = new Date();
  const year = searchParams.year ? parseInt(searchParams.year) : now.getFullYear();
  const month = searchParams.month ? parseInt(searchParams.month) : now.getMonth() + 1;

  const [shifts, staff] = await Promise.all([getShiftsForMonth(year, month), getStaffMembers()]);

  const shiftsByDay = new Map<string, typeof shifts>();
  for (const shift of shifts) {
    const key = shift.shift_date;
    if (!shiftsByDay.has(key)) shiftsByDay.set(key, []);
    shiftsByDay.get(key)!.push(shift);
  }

  const weeks = getMonthGrid(year, month);
  const prevMonth = month === 1 ? { year: year - 1, month: 12 } : { year, month: month - 1 };
  const nextMonth = month === 12 ? { year: year + 1, month: 1 } : { year, month: month + 1 };
  const todayKey = toDateKey(now);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-ink">{monthNames[month - 1]} {year}</h1>
        <div className="flex gap-2">
          <Link
            href={`/schedule?year=${prevMonth.year}&month=${prevMonth.month}`}
            className="rounded-md border border-border px-3 py-1.5 text-sm text-ink hover:bg-paper"
          >
            ← Prev
          </Link>
          <Link
            href={`/schedule?year=${nextMonth.year}&month=${nextMonth.month}`}
            className="rounded-md border border-border px-3 py-1.5 text-sm text-ink hover:bg-paper"
          >
            Next →
          </Link>
        </div>
      </div>

      <div className="mb-8 overflow-hidden rounded-lg border border-border bg-surface">
        <div className="grid grid-cols-7 border-b border-border bg-paper">
          {weekdayLabels.map((d) => (
            <div key={d} className="px-2 py-2 text-center text-xs font-medium uppercase tracking-wide text-muted">
              {d}
            </div>
          ))}
        </div>
        {weeks.map((week, wi) => (
          <div key={wi} className="grid grid-cols-7 border-b border-border last:border-0">
            {week.map((day) => {
              const key = toDateKey(day);
              const inMonth = day.getMonth() + 1 === month;
              const dayShifts = shiftsByDay.get(key) ?? [];
              return (
                <div
                  key={key}
                  className={`min-h-[90px] border-r border-border p-1.5 last:border-r-0 ${
                    inMonth ? "bg-surface" : "bg-paper/50"
                  }`}
                >
                  <p className={`mb-1 text-xs ${key === todayKey ? "font-semibold text-brand" : inMonth ? "text-muted" : "text-muted/50"}`}>
                    {day.getDate()}
                  </p>
                  <div className="space-y-0.5">
                    {dayShifts.map((shift) => (
                      <ShiftBadge key={shift.id} shift={shift} />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>

      <ShiftForm staff={staff} />
    </div>
  );
}
