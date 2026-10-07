"use client";

import { useRef, useTransition } from "react";
import { addShift } from "@/lib/actions";
import type { StaffMember } from "@/lib/types";

export default function ShiftForm({ staff }: { staff: StaffMember[] }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      await addShift(formData);
      formRef.current?.reset();
    });
  }

  const inputClass =
    "w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-ink focus:border-brand";
  const labelClass = "mb-1.5 block text-sm font-medium text-ink";

  if (staff.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-surface p-5 text-sm text-muted">
        Add a staff member on the Staff page first, then come back here to assign shifts.
      </div>
    );
  }

  return (
    <form ref={formRef} action={handleSubmit} className="grid grid-cols-2 gap-4 rounded-lg border border-border bg-surface p-5">
      <div className="col-span-2">
        <h2 className="text-base font-semibold text-ink">Assign shift</h2>
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
        <label className={labelClass} htmlFor="shift_date">Date</label>
        <input id="shift_date" name="shift_date" type="date" required className={inputClass} />
      </div>

      <div>
        <label className={labelClass} htmlFor="shift_type">Shift type</label>
        <select id="shift_type" name="shift_type" className={inputClass} defaultValue="fruehdienst">
          <option value="fruehdienst">Frühdienst</option>
          <option value="spaetdienst">Spätdienst</option>
          <option value="nachtdienst">Nachtdienst</option>
          <option value="bereitschaft">Bereitschaft</option>
          <option value="custom">Custom</option>
        </select>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className={labelClass} htmlFor="start_time">Start</label>
          <input id="start_time" name="start_time" type="time" required className={inputClass} defaultValue="07:00" />
        </div>
        <div>
          <label className={labelClass} htmlFor="end_time">End</label>
          <input id="end_time" name="end_time" type="time" required className={inputClass} defaultValue="15:00" />
        </div>
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
          {isPending ? "Assigning…" : "Assign shift"}
        </button>
      </div>
    </form>
  );
}
