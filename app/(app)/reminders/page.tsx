import { getUpcomingReminders } from "@/lib/queries";
import StatusBadge from "@/components/StatusBadge";
import ReminderActions from "@/components/ReminderActions";
import type { Reminder } from "@/lib/types";

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });
}

function formatDay(iso: string) {
  return new Date(iso).toLocaleDateString("de-DE", { weekday: "long", day: "numeric", month: "long" });
}

function groupByDay(reminders: Reminder[]) {
  const groups = new Map<string, Reminder[]>();
  for (const r of reminders) {
    const key = new Date(r.scheduled_for).toDateString();
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(r);
  }
  return Array.from(groups.entries());
}

export default async function RemindersPage() {
  const reminders = await getUpcomingReminders(7);
  const days = groupByDay(reminders);

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold text-ink">Reminder schedule</h1>

      {days.length === 0 && (
        <div className="rounded-lg border border-border bg-surface px-4 py-10 text-center text-sm text-muted">
          No reminders scheduled for the next 7 days. Generate today&rsquo;s reminders from the Today page.
        </div>
      )}

      <div className="space-y-6">
        {days.map(([day, dayReminders]) => (
          <div key={day} className="overflow-hidden rounded-lg border border-border bg-surface">
            <div className="border-b border-border bg-paper px-4 py-3">
              <h2 className="text-sm font-semibold text-ink">{formatDay(dayReminders[0].scheduled_for)}</h2>
            </div>
            <table className="w-full text-left text-sm">
              <tbody>
                {dayReminders.map((r) => (
                  <tr key={r.id} className="border-b border-border last:border-0">
                    <td className="px-4 py-3 tabular-nums text-ink">{formatTime(r.scheduled_for)}</td>
                    <td className="px-4 py-3 text-ink">{r.patient_name}</td>
                    <td className="px-4 py-3 text-ink">
                      {r.medication_name}
                      {r.dosage && <span className="text-muted"> · {r.dosage}</span>}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={r.status} />
                    </td>
                    <td className="px-4 py-3">
                      <ReminderActions id={r.id} status={r.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
      </div>
    </div>
  );
}
