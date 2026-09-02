"use client";

import { useRef, useTransition } from "react";
import { addPatient } from "@/lib/actions";

export default function PatientForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      await addPatient(formData);
      formRef.current?.reset();
    });
  }

  const inputClass =
    "w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-ink focus:border-brand";
  const labelClass = "mb-1.5 block text-sm font-medium text-ink";

  return (
    <form ref={formRef} action={handleSubmit} className="grid grid-cols-2 gap-4 rounded-lg border border-border bg-surface p-5">
      <div className="col-span-2">
        <h2 className="text-base font-semibold text-ink">Add patient</h2>
      </div>

      <div>
        <label className={labelClass} htmlFor="full_name">Full name</label>
        <input id="full_name" name="full_name" required className={inputClass} placeholder="Frau Müller" />
      </div>

      <div>
        <label className={labelClass} htmlFor="date_of_birth">Date of birth</label>
        <input id="date_of_birth" name="date_of_birth" type="date" className={inputClass} />
      </div>

      <div>
        <label className={labelClass} htmlFor="pflegegrad">Pflegegrad</label>
        <select id="pflegegrad" name="pflegegrad" className={inputClass} defaultValue="">
          <option value="">Not set</option>
          {[1, 2, 3, 4, 5].map((n) => (
            <option key={n} value={n}>{n}</option>
          ))}
        </select>
      </div>

      <div>
        <label className={labelClass} htmlFor="phone">Phone</label>
        <input id="phone" name="phone" className={inputClass} placeholder="+49 ..." />
      </div>

      <div className="col-span-2">
        <label className={labelClass} htmlFor="address">Address</label>
        <input id="address" name="address" className={inputClass} placeholder="Straße, PLZ, Stadt" />
      </div>

      <div className="col-span-2">
        <label className={labelClass} htmlFor="notes">Notes</label>
        <textarea id="notes" name="notes" rows={2} className={inputClass} />
      </div>

      <div className="col-span-2">
        <button
          type="submit"
          disabled={isPending}
          className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-dark disabled:opacity-60"
        >
          {isPending ? "Adding…" : "Add patient"}
        </button>
      </div>
    </form>
  );
}
