"use client";

import { useRef, useTransition } from "react";
import { addMedication } from "@/lib/actions";

export default function MedicationForm({ patientId }: { patientId: string }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      await addMedication(patientId, formData);
      formRef.current?.reset();
    });
  }

  const inputClass =
    "w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-ink focus:border-brand";
  const labelClass = "mb-1.5 block text-sm font-medium text-ink";

  return (
    <form ref={formRef} action={handleSubmit} className="grid grid-cols-2 gap-4 rounded-lg border border-border bg-surface p-5">
      <div className="col-span-2">
        <h2 className="text-base font-semibold text-ink">Add medication</h2>
      </div>

      <div>
        <label className={labelClass} htmlFor="name">Medication name</label>
        <input id="name" name="name" required className={inputClass} placeholder="Aspirin" />
      </div>

      <div>
        <label className={labelClass} htmlFor="dosage">Dosage</label>
        <input id="dosage" name="dosage" className={inputClass} placeholder="100 mg" />
      </div>

      <div className="col-span-2">
        <label className={labelClass} htmlFor="times">Reminder times</label>
        <input
          id="times"
          name="times"
          required
          className={inputClass}
          placeholder="08:00, 14:00, 20:00"
        />
        <p className="mt-1 text-xs text-muted">Comma-separated, 24-hour format.</p>
      </div>

      <div className="col-span-2">
        <button
          type="submit"
          disabled={isPending}
          className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-dark disabled:opacity-60"
        >
          {isPending ? "Adding…" : "Add medication"}
        </button>
      </div>
    </form>
  );
}
