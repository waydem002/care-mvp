import { getTodayReminders } from "@/lib/queries";
import StatusBadge from "@/components/StatusBadge";
import ReminderActions from "@/components/ReminderActions";
import GenerateRemindersButton from "@/components/GenerateRemindersButton";

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });
}

export default async function DashboardPage() {
  const reminders = await getTodayReminders();

  const counts = reminders.reduce(
    (acc, r) => {
      acc[r.status] += 1;
      return acc;
    },
    { pending: 0, sent: 0, confirmed: 0, missed: 0 }
  );

  return (
    <div>
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Today</h1>
          <p className="mt-1 text-sm text-muted">
            {new Date().toLocaleDateString("de-DE", { weekday: "long", day: "numeric", month: "long" })}
          </p>
        </div>
        <GenerateRemindersButton />
      </div>

      <div className="mb-8 grid grid-cols-4 gap-4">
        <SummaryCard label="Upcoming" value={counts.pending} tone="text-muted" />
        <SummaryCard label="Sent" value={counts.sent} tone="text-status-pending" />
        <SummaryCard label="Confirmed" value={counts.confirmed} tone="text-status-confirmed" />
        <SummaryCard label="Missed" value={counts.missed} tone="text-status-missed" />
      </div>

      <div className="overflow-hidden rounded-lg border border-border bg-surface">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-border bg-paper text-xs font-medium uppercase tracking-wide text-muted">
              <th className="px-4 py-3 tabular-nums">Time</th>
              <th className="px-4 py-3">Patient</th>
              <th className="px-4 py-3">Medication</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {reminders.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-sm text-muted">
                  No reminders generated for today yet. Click &ldquo;Generate today&rsquo;s reminders&rdquo; above.
                </td>
              </tr>
            )}
            {reminders.map((r) => (
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
    </div>
  );
}

function SummaryCard({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div className="rounded-lg border border-border bg-surface px-4 py-3">
      <p className="text-xs font-medium uppercase tracking-wide text-muted">{label}</p>
      <p className={`mt-1 text-2xl font-semibold tabular-nums ${tone}`}>{value}</p>
    </div>
  );
}
