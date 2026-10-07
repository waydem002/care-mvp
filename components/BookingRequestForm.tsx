"use client";

import { useRef, useState, useTransition } from "react";
import { submitBookingRequest } from "@/lib/actions";

export default function BookingRequestForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const [isPending, startTransition] = useTransition();
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      try {
        await submitBookingRequest(formData);
        setSubmitted(true);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Something went wrong. Please try again.");
      }
    });
  }

  const inputClass =
    "w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-ink focus:border-brand";
  const labelClass = "mb-1.5 block text-sm font-medium text-ink";

  if (submitted) {
    return (
      <div className="rounded-lg border border-status-confirmed/30 bg-status-confirmedBg p-6 text-center">
        <p className="text-base font-medium text-status-confirmed">Thank you — your request has been sent.</p>
        <p className="mt-1 text-sm text-ink">We'll get back to you as soon as possible.</p>
      </div>
    );
  }

  return (
    <form ref={formRef} action={handleSubmit} className="grid grid-cols-1 gap-4 rounded-lg border border-border bg-surface p-6 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <label className={labelClass} htmlFor="requester_name">Your name</label>
        <input id="requester_name" name="requester_name" required className={inputClass} />
      </div>

      <div>
        <label className={labelClass} htmlFor="requester_phone">Phone</label>
        <input id="requester_phone" name="requester_phone" className={inputClass} placeholder="+49 ..." />
      </div>

      <div>
        <label className={labelClass} htmlFor="requester_email">Email</label>
        <input id="requester_email" name="requester_email" type="email" className={inputClass} />
      </div>

      <div className="sm:col-span-2">
        <label className={labelClass} htmlFor="patient_name">Patient name (if this is about an existing client)</label>
        <input id="patient_name" name="patient_name" className={inputClass} placeholder="Optional" />
      </div>

      <div>
        <label className={labelClass} htmlFor="request_type">What do you need?</label>
        <select id="request_type" name="request_type" className={inputClass} defaultValue="consultation">
          <option value="consultation">Consultation</option>
          <option value="schedule_change">Schedule change</option>
          <option value="extra_visit">Extra visit</option>
          <option value="callback">Callback request</option>
          <option value="other">Other</option>
        </select>
      </div>

      <div>
        <label className={labelClass} htmlFor="preferred_date">Preferred date</label>
        <input id="preferred_date" name="preferred_date" type="date" className={inputClass} />
      </div>

      <div className="sm:col-span-2">
        <label className={labelClass} htmlFor="message">Message</label>
        <textarea id="message" name="message" rows={4} className={inputClass} placeholder="Tell us a bit more..." />
      </div>

      {error && <p className="sm:col-span-2 text-sm text-status-missed">{error}</p>}

      <div className="sm:col-span-2">
        <button
          type="submit"
          disabled={isPending}
          className="w-full rounded-md bg-brand px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-brand-dark disabled:opacity-60 sm:w-auto"
        >
          {isPending ? "Sending…" : "Send request"}
        </button>
      </div>
    </form>
  );
}
