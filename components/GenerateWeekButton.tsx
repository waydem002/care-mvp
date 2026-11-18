"use client";

import { useState, useTransition } from "react";
import { planWeekAutomatically } from "@/lib/actions";

const dayNames = ["Mon", "Tue", "Wed", "Thu", "Fri"];

export default function GenerateWeekButton({ weekStartKey, label }: { weekStartKey: string; label: string }) {
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  function handleClick() {
    setMessage(null);
    startTransition(async () => {
      try {
        const r = await planWeekAutomatically(weekStartKey);
        const parts = [
          `${r.created} visits copied.`,
          r.saturday.length ? `Saturday: ${r.saturday.join(", ")}.` : "",
          r.sunday.length ? `Sunday: ${r.sunday.join(", ")}.` : "",
          r.newWeekdayOff.length
            ? `New weekday off: ${r.newWeekdayOff.map((x) => `${x.name} (${dayNames[x.weekday]})`).join(", ")}.`
            : "",
          "Check the yellow boxes for visits that need cover.",
        ];
        setMessage(parts.filter(Boolean).join(" "));
      } catch (e) {
        setMessage("Planning failed. Please try again or check the server log.");
      }
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <div>
        <button
          onClick={handleClick}
          disabled={isPending}
          className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-dark disabled:opacity-60"
        >
          {isPending ? "Planning…" : `Plan ${label} automatically`}
        </button>
      </div>
      {message && <p className="max-w-2xl text-sm text-muted">{message}</p>}
    </div>
  );
}
