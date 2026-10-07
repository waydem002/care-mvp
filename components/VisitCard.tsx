"use client";

import { useTransition } from "react";
import { updateVisitStatus, deleteVisit } from "@/lib/actions";
import type { Visit } from "@/lib/types";

const visitTypeLabels: Record<string, string> = {
  care: "Pflege",
  medication: "Medikation",
  check_in: "Kontrollbesuch",
  other: "Sonstiges",
};

const statusStyles: Record<string, string> = {
  planned: "bg-border text-ink",
  completed: "bg-status-confirmedBg text-status-confirmed",
  cancelled: "bg-status-missedBg text-status-missed",
};

export default function VisitCard({ visit }: { visit: Visit }) {
  const [isPending, startTransition] = useTransition();

  return (
    <div className="flex items-start justify-between gap-2 rounded-md border border-border bg-surface px-3 py-2">
      <div className="min-w-0">
        <p className="text-sm font-medium text-ink">
          {visit.sequence_order}. {visit.patient_name}
          {visit.scheduled_time && <span className="ml-1.5 font-normal text-muted">{visit.scheduled_time.slice(0, 5)}</span>}
        </p>
        {visit.patient_address && <p className="truncate text-xs text-muted">{visit.patient_address}</p>}
        <div className="mt-1 flex items-center gap-1.5">
          <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${statusStyles[visit.status]}`}>
            {visit.status}
          </span>
          <span className="text-[11px] text-muted">{visitTypeLabels[visit.visit_type] ?? visit.visit_type}</span>
        </div>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1">
        {visit.status === "planned" && (
          <div className="flex gap-1">
            <button
              disabled={isPending}
              onClick={() => startTransition(() => updateVisitStatus(visit.id, "completed"))}
              className="rounded border border-border px-1.5 py-0.5 text-[11px] text-ink hover:bg-paper disabled:opacity-40"
            >
              Done
            </button>
            <button
              disabled={isPending}
              onClick={() => startTransition(() => updateVisitStatus(visit.id, "cancelled"))}
              className="rounded border border-border px-1.5 py-0.5 text-[11px] text-ink hover:bg-paper disabled:opacity-40"
            >
              Cancel
            </button>
          </div>
        )}
        <button
          disabled={isPending}
          onClick={() => startTransition(() => deleteVisit(visit.id))}
          className="text-[11px] text-muted hover:text-status-missed disabled:opacity-40"
        >
          Remove
        </button>
      </div>
    </div>
  );
}
