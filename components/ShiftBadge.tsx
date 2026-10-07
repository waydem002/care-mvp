"use client";

import { useTransition } from "react";
import { deleteShift } from "@/lib/actions";
import type { Shift } from "@/lib/types";

const shiftTypeLabels: Record<string, string> = {
  fruehdienst: "Früh",
  spaetdienst: "Spät",
  nachtdienst: "Nacht",
  bereitschaft: "Bereit.",
  custom: "Sonder",
};

const shiftTypeStyles: Record<string, string> = {
  fruehdienst: "bg-status-confirmedBg text-status-confirmed",
  spaetdienst: "bg-status-pendingBg text-status-pending",
  nachtdienst: "bg-brand/10 text-brand",
  bereitschaft: "bg-status-missedBg text-status-missed",
  custom: "bg-border text-ink",
};

export default function ShiftBadge({ shift }: { shift: Shift }) {
  const [isPending, startTransition] = useTransition();

  return (
    <div
      className={`group flex items-center justify-between gap-1 rounded px-1.5 py-0.5 text-[11px] leading-tight ${
        shiftTypeStyles[shift.shift_type] ?? "bg-border text-ink"
      }`}
      title={`${shift.staff_name} · ${shiftTypeLabels[shift.shift_type] ?? shift.shift_type} · ${shift.start_time.slice(0, 5)}–${shift.end_time.slice(0, 5)}`}
    >
      <span className="truncate">
        {shift.staff_name} · {shiftTypeLabels[shift.shift_type] ?? shift.shift_type}
      </span>
      <button
        onClick={() => startTransition(() => deleteShift(shift.id))}
        disabled={isPending}
        className="shrink-0 opacity-0 hover:opacity-100 group-hover:opacity-60 disabled:opacity-30"
        aria-label="Remove shift"
      >
        ×
      </button>
    </div>
  );
}
