"use client";

import { useRef, useTransition } from "react";
import { addVisit } from "@/lib/actions";
import type { StaffMember, Patient } from "@/lib/types";

export default function VisitForm({ staff, patients }: { staff: StaffMember[]; patients: Patient[] }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      await addVisit(formData);
      formRef.current?.reset();
    });
  }

  const inputClass =
    "w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-ink focus:border-brand";
  const labelClass = "mb-1.5 block text-sm font-medium text-ink";

  if (staff.length === 0 || patients.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-surface p-5 text-sm text-muted">
        Add at least one staff member and one patient before planning a route.
      </div>
    );
  }

  return (
    <form ref={formRef} action={handleSubmit} className="grid grid-cols-2 gap-4 rounded-lg border border-border bg-surface p-5">
      <div className="col-span-2">
        <h2 className="text-base font-semibold text-ink">Add stop to a route</h2>
      </div>

      <div>
        <label className={labelClass} htmlFor="staff_member_id">Staff member</label>
        <select id="staff_member_id" name="staff_member_id" required className={inputClass}>
          {staff.map((s) => (
            <option key={s.id} value={s.id}>{s.full_name}</option>
          ))}
        </select>
      </div>

      <div>
        <label className={labelClass} htmlFor="patient_id">Patient</label>
        <select id="patient_id" name="patient_id" required className={inputClass}>
          {patients.map((p) => (
            <option key={p.id} value={p.id}>{p.full_name}</option>
          ))}
        </select>
      </div>

      <div>
        <label className={labelClass} htmlFor="visit_date">Date</label>
        <input id="visit_date" name="visit_date" type="date" required className={inputClass} />
      </div>

      <div>
        <label className={labelClass} htmlFor="sequence_order">Stop number</label>
        <input id="sequence_order" name="sequence_order" type="number" min="1" defaultValue="1" required className={inputClass} />
        <p className="mt-1 text-xs text-muted">Order within this staff member's route that day.</p>
      </div>

      <div>
        <label className={labelClass} htmlFor="scheduled_time">Estimated time</label>
        <input id="scheduled_time" name="scheduled_time" type="time" className={inputClass} />
      </div>

      <div>
        <label className={labelClass} htmlFor="visit_type">Visit type</label>
        <select id="visit_type" name="visit_type" className={inputClass} defaultValue="care">
          <option value="care">Pflege (care)</option>
          <option value="medication">Medikation</option>
          <option value="check_in">Kontrollbesuch</option>
          <option value="other">Sonstiges</option>
        </select>
      </div>

      <div className="col-span-2">
        <label className={labelClass} htmlFor="notes">Notes</label>
        <input id="notes" name="notes" className={inputClass} placeholder="Optional" />
      </div>

      <div className="col-span-2">
        <button
          type="submit"
          disabled={isPending}
          className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-dark disabled:opacity-60"
        >
          {isPending ? "Adding…" : "Add stop"}
        </button>
      </div>
    </form>
  );
}
