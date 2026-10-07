"use client";

import { useRef, useTransition } from "react";
import { addStaffMember } from "@/lib/actions";

export default function StaffForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      await addStaffMember(formData);
      formRef.current?.reset();
    });
  }

  const inputClass =
    "w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-ink focus:border-brand";
  const labelClass = "mb-1.5 block text-sm font-medium text-ink";

  return (
    <form ref={formRef} action={handleSubmit} className="grid grid-cols-2 gap-4 rounded-lg border border-border bg-surface p-5">
      <div className="col-span-2">
        <h2 className="text-base font-semibold text-ink">Add staff member</h2>
      </div>

      <div>
        <label className={labelClass} htmlFor="full_name">Full name</label>
        <input id="full_name" name="full_name" required className={inputClass} placeholder="Anna Weber" />
      </div>

      <div>
        <label className={labelClass} htmlFor="role">Role</label>
        <select id="role" name="role" className={inputClass} defaultValue="caregiver">
          <option value="nurse">Nurse</option>
          <option value="caregiver">Caregiver</option>
          <option value="driver">Driver</option>
          <option value="admin">Admin</option>
          <option value="other">Other</option>
        </select>
      </div>

      <div>
        <label className={labelClass} htmlFor="phone">Phone</label>
        <input id="phone" name="phone" className={inputClass} placeholder="+49 ..." />
      </div>

      <div>
        <label className={labelClass} htmlFor="email">Email</label>
        <input id="email" name="email" type="email" className={inputClass} />
      </div>

      <div className="col-span-2">
        <button
          type="submit"
          disabled={isPending}
          className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-dark disabled:opacity-60"
        >
          {isPending ? "Adding…" : "Add staff member"}
        </button>
      </div>
    </form>
  );
}
