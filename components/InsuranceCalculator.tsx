"use client";

import { useMemo, useState } from "react";
import type { InsuranceRate } from "@/lib/types";

function formatEuro(amount: number) {
  return amount.toLocaleString("de-DE", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
}

export default function InsuranceCalculator({ rates }: { rates: InsuranceRate[] }) {
  const [pflegegrad, setPflegegrad] = useState(3);
  const [hoursPerMonth, setHoursPerMonth] = useState(20);
  const [hourlyRate, setHourlyRate] = useState(45);

  const rate = rates.find((r) => r.pflegegrad === pflegegrad);
  const monthlyCost = hoursPerMonth * hourlyRate;

  const result = useMemo(() => {
    if (!rate) return null;
    const insuranceCovers = Math.min(monthlyCost, rate.pflegesachleistung_monthly);
    const clientPays = Math.max(0, monthlyCost - rate.pflegesachleistung_monthly);
    return { insuranceCovers, clientPays, entlastungsbetrag: rate.entlastungsbetrag_monthly };
  }, [rate, monthlyCost]);

  const inputClass =
    "w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-ink focus:border-brand";
  const labelClass = "mb-1.5 block text-sm font-medium text-ink";

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-status-pending/40 bg-status-pendingBg px-4 py-3 text-sm text-ink">
        <strong>Estimate only, not a guarantee.</strong> Based on standard SGB XI Pflegesachleistung amounts as of
        2026 (unchanged since Jan 2025; next legally scheduled adjustment is Jan 2028 — verify this table is still
        current if using it after that date). Actual entitlement depends on the individual's Pflegekasse assessment.
        Doesn't include Pflegegeld, Verhinderungspflege, Kurzzeitpflege, or combination benefits. Not legal or
        financial advice — confirm with the client's care insurance provider.
      </div>

      <div className="grid grid-cols-1 gap-4 rounded-lg border border-border bg-surface p-5 sm:grid-cols-3">
        <div>
          <label className={labelClass} htmlFor="pflegegrad">Pflegegrad</label>
          <select
            id="pflegegrad"
            value={pflegegrad}
            onChange={(e) => setPflegegrad(Number(e.target.value))}
            className={inputClass}
          >
            {rates.map((r) => (
              <option key={r.pflegegrad} value={r.pflegegrad}>Pflegegrad {r.pflegegrad}</option>
            ))}
          </select>
        </div>

        <div>
          <label className={labelClass} htmlFor="hours">Care hours / month</label>
          <input
            id="hours"
            type="number"
            min={0}
            value={hoursPerMonth}
            onChange={(e) => setHoursPerMonth(Number(e.target.value) || 0)}
            className={inputClass}
          />
        </div>

        <div>
          <label className={labelClass} htmlFor="hourlyRate">Hourly rate (€)</label>
          <input
            id="hourlyRate"
            type="number"
            min={0}
            value={hourlyRate}
            onChange={(e) => setHourlyRate(Number(e.target.value) || 0)}
            className={inputClass}
          />
        </div>
      </div>

      {result && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-lg border border-border bg-surface p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-muted">Estimated monthly cost</p>
            <p className="mt-1 text-2xl font-semibold text-ink">{formatEuro(monthlyCost)}</p>
          </div>
          <div className="rounded-lg border border-status-confirmed/30 bg-status-confirmedBg p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-status-confirmed">Insurance covers</p>
            <p className="mt-1 text-2xl font-semibold text-status-confirmed">{formatEuro(result.insuranceCovers)}</p>
          </div>
          <div className="rounded-lg border border-status-pending/30 bg-status-pendingBg p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-status-pending">Client pays (Eigenanteil)</p>
            <p className="mt-1 text-2xl font-semibold text-status-pending">{formatEuro(result.clientPays)}</p>
          </div>
        </div>
      )}

      {result && (
        <p className="text-sm text-muted">
          Additionally available: <strong className="text-ink">{formatEuro(result.entlastungsbetrag)}/month</strong> Entlastungsbetrag
          for qualifying support/companionship services, separate from the above — shown here for reference, not included in the cost comparison.
        </p>
      )}
    </div>
  );
}
