import type { ReminderStatus } from "@/lib/types";

const config: Record<ReminderStatus, { label: string; text: string; bg: string }> = {
  pending: { label: "Upcoming", text: "text-muted", bg: "bg-border/60" },
  sent: { label: "Sent", text: "text-status-pending", bg: "bg-status-pendingBg" },
  confirmed: { label: "Confirmed", text: "text-status-confirmed", bg: "bg-status-confirmedBg" },
  missed: { label: "Missed", text: "text-status-missed", bg: "bg-status-missedBg" },
};

export default function StatusBadge({ status }: { status: ReminderStatus }) {
  const c = config[status];
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${c.text} ${c.bg}`}>
      {c.label}
    </span>
  );
}
