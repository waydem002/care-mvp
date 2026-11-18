"use client";

import { useRef, useTransition } from "react";
import { addAbsence } from "@/lib/actions";
import type { StaffMember } from "@/lib/types";

export default function AbsenceForm({ staff }: { staff: StaffMember[] }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      await addAbsence(formData);
      formRef.current?.reset();
    });
  }

  const inputClass = "w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-ink focus:border-brand";
  const labelClass = "mb-1.5 block text-sm font-medium text-ink";

  return (
    <form ref={formRef} action={handleSubmit} className="grid grid-cols-2 gap-4 rounded-lg border border-border bg-surface p-5 md:grid-cols-4">
      <div className="col-span-2 md:col-span-4">
        <h2 className="text-base font-semibold text-ink">Add absence</h2>
        <p className="mt-1 text-xs text-muted">Holiday, sick day or an extra FREI day. The Tours page then lists every visit that has no carer.</p>
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
        <label className={labelClass} htmlFor="absence_type">Type</label>
        <select id="absence_type" name="absence_type" className={inputClass} defaultValue="urlaub">
          <option value="urlaub">Urlaub (holiday)</option>
          <option value="krank">Krank (sick)</option>
          <option value="frei">FREI (extra day off)</option>
          <option value="sonstiges">Other</option>
        </select>
      </div>
      <div>
        <label className={labelClass} htmlFor="start_date">From</label>
        <input id="start_date" name="start_date" type="date" required className={inputClass} />
      </div>
      <div>
        <label className={labelClass} htmlFor="end_date">To (leave empty for one day)</label>
        <input id="end_date" name="end_date" type="date" className={inputClass} />
      </div>
      <div className="col-span-2 md:col-span-4">
        <label className={labelClass} htmlFor="note">Note</label>
        <input id="note" name="note" className={inputClass} />
      </div>
      <div className="col-span-2 md:col-span-4">
        <button type="submit" disabled={isPending} className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-dark disabled:opacity-60">
          {isPending ? "Saving…" : "Add absence"}
        </button>
      </div>
    </form>
  );
}
