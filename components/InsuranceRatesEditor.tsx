"use client";

import { useState, useTransition } from "react";
import { updateInsuranceRate } from "@/lib/actions";
import type { InsuranceRate } from "@/lib/types";

export default function InsuranceRatesEditor({ rates }: { rates: InsuranceRate[] }) {
  const [expanded, setExpanded] = useState(false);
  const [isPending, startTransition] = useTransition();

  const inputClass =
    "w-full rounded-md border border-border bg-surface px-2 py-1.5 text-sm text-ink focus:border-brand";

  return (
    <div className="rounded-lg border border-border bg-surface p-5">
      <button
        onClick={() => setExpanded((s) => !s)}
        className="text-sm font-semibold text-ink hover:text-brand"
      >
        {expanded ? "Hide" : "Edit"} rate table (only when the law changes)
      </button>

      {expanded && (
        <div className="mt-4 space-y-3">
          <p className="text-xs text-muted">
            These figures are set by German law (SGB XI) and normally only change when the government adjusts them
            — the current figures are stable through 2026, with the next scheduled review in Jan 2028. Only edit
            this if you've confirmed new official amounts.
          </p>
          {rates.map((rate) => (
            <form
              key={rate.pflegegrad}
              action={(formData) => startTransition(() => updateInsuranceRate(formData))}
              className="grid grid-cols-2 gap-2 rounded-md border border-border bg-paper p-3 sm:grid-cols-5"
            >
              <input type="hidden" name="pflegegrad" value={rate.pflegegrad} />
              <div className="flex items-center text-sm font-medium text-ink">Pflegegrad {rate.pflegegrad}</div>
              <div>
                <label className="mb-1 block text-[11px] text-muted">Pflegesachleistung €/mo</label>
                <input name="pflegesachleistung_monthly" type="number" step="0.01" defaultValue={rate.pflegesachleistung_monthly} className={inputClass} />
              </div>
              <div>
                <label className="mb-1 block text-[11px] text-muted">Pflegegeld €/mo</label>
                <input name="pflegegeld_monthly" type="number" step="0.01" defaultValue={rate.pflegegeld_monthly} className={inputClass} />
              </div>
              <div>
                <label className="mb-1 block text-[11px] text-muted">Entlastungsbetrag €/mo</label>
                <input name="entlastungsbetrag_monthly" type="number" step="0.01" defaultValue={rate.entlastungsbetrag_monthly} className={inputClass} />
              </div>
              <div>
                <label className="mb-1 block text-[11px] text-muted">Effective from</label>
                <input name="effective_from" type="date" defaultValue={rate.effective_from} className={inputClass} />
              </div>
              <input type="hidden" name="notes" value={rate.notes ?? ""} />
              <div className="col-span-2 sm:col-span-5">
                <button
                  type="submit"
                  disabled={isPending}
                  className="rounded-md border border-border px-3 py-1 text-xs font-medium text-ink hover:bg-surface disabled:opacity-40"
                >
                  {isPending ? "Saving…" : "Save"}
                </button>
              </div>
            </form>
          ))}
        </div>
      )}
    </div>
  );
}
