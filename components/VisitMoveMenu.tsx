"use client";

import { useTransition } from "react";
import { assignVisitToStaff, changeVisitPatient } from "@/lib/actions";
import { usePlanOptions } from "@/components/PlanOptions";

// Open editing for one visit: cover it, move it for good, or change the client.
export default function VisitMoveMenu({
  visitId,
  staffId,
  patientId,
}: {
  visitId: string;
  staffId: string;
  patientId: string;
}) {
  const { staff, patients } = usePlanOptions();
  const [isPending, startTransition] = useTransition();
  const selectClass = "w-full rounded border border-border bg-surface px-1.5 py-1 text-[11px] text-ink";

  return (
    <details className="text-[11px]">
      <summary className="cursor-pointer text-muted hover:text-ink">Change</summary>
      <div className="mt-1 w-44 space-y-1.5 rounded-md border border-border bg-surface p-2 shadow-sm">
        <label className="block text-muted">
          Cover (returns next week)
          <select
            className={selectClass}
            disabled={isPending}
            value=""
            onChange={(e) => e.target.value && startTransition(() => assignVisitToStaff(visitId, e.target.value, false))}
          >
            <option value="">— choose carer —</option>
            {staff.filter((s) => s.id !== staffId).map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </label>
        <label className="block text-muted">
          Move for good
          <select
            className={selectClass}
            disabled={isPending}
            value=""
            onChange={(e) => e.target.value && startTransition(() => assignVisitToStaff(visitId, e.target.value, true))}
          >
            <option value="">— choose carer —</option>
            {staff.filter((s) => s.id !== staffId).map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </label>
        <label className="block text-muted">
          Change client
          <select
            className={selectClass}
            disabled={isPending}
            value=""
            onChange={(e) => e.target.value && startTransition(() => changeVisitPatient(visitId, e.target.value))}
          >
            <option value="">— choose client —</option>
            {patients.filter((p) => p.id !== patientId).map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </label>
      </div>
    </details>
  );
}
