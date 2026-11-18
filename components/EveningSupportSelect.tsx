"use client";

import { useTransition } from "react";
import { setEveningSupport } from "@/lib/actions";

export default function EveningSupportSelect({
  dateKey,
  leadName,
  current,
  options,
}: {
  dateKey: string;
  leadName: string;
  current: string;
  options: { id: string; name: string }[];
}) {
  const [isPending, startTransition] = useTransition();
  return (
    <label className="flex items-center gap-2 text-xs text-muted">
      Evening with {leadName}:
      <select
        defaultValue={options.find((o) => o.name === current)?.id ?? ""}
        disabled={isPending}
        onChange={(e) => startTransition(() => setEveningSupport(dateKey, e.target.value))}
        className="rounded-md border border-border bg-surface px-2 py-1 text-xs text-ink"
      >
        <option value="">— not assigned —</option>
        {options.map((o) => (
          <option key={o.id} value={o.id}>{o.name}</option>
        ))}
      </select>
    </label>
  );
}
