"use client";

import { useTransition } from "react";
import { setScheduleCell } from "@/lib/actions";

export default function ScheduleCell({
  patientId,
  weekday,
  kind,
  value,
  max,
}: {
  patientId: string;
  weekday: number;
  kind: "care" | "cleaning";
  value: number;
  max: number;
}) {
  const [isPending, startTransition] = useTransition();
  return (
    <select
      value={value}
      disabled={isPending}
      onChange={(e) => startTransition(() => setScheduleCell(patientId, weekday, kind, Number(e.target.value)))}
      className={`w-full rounded border px-1 py-1 text-center text-sm disabled:opacity-60 ${
        value > 0 ? "border-brand bg-brand/10 font-semibold text-ink" : "border-border bg-surface text-muted"
      }`}
    >
      {Array.from({ length: max + 1 }, (_, n) => (
        <option key={n} value={n}>{n === 0 ? "–" : n}</option>
      ))}
    </select>
  );
}
