"use client";

import { useTransition } from "react";
import { setDayStatus } from "@/lib/actions";

type Status = "frei" | "fd" | "sd" | "abenddienst" | "buerodienst";

const labels: Record<Status, string> = {
  frei: "FREI",
  fd: "FD",
  sd: "SD",
  abenddienst: "Abend",
  buerodienst: "Büro",
};

const colours: Record<Status, string> = {
  frei: "bg-red-100 text-red-800",
  fd: "bg-sky-100 text-sky-800",
  sd: "bg-violet-100 text-violet-800",
  abenddienst: "bg-indigo-100 text-indigo-800",
  buerodienst: "bg-gray-200 text-gray-800",
};

export default function GridCell({
  staffId,
  dateKey,
  active,
  absence,
  visitCount,
}: {
  staffId: string;
  dateKey: string;
  active: Status[];
  absence: string | null; // "Urlaub" / "krank" … from the Absences page
  visitCount: number;
}) {
  const [isPending, startTransition] = useTransition();
  const all: Status[] = ["frei", "fd", "sd", "abenddienst", "buerodienst"];

  return (
    <details className="group relative">
      <summary className="flex min-h-[44px] cursor-pointer list-none flex-wrap content-start gap-1 rounded-md border border-border bg-surface p-1.5 hover:bg-paper">
        {active.map((s) => (
          <span key={s} className={`rounded px-1.5 py-0.5 text-[11px] font-semibold ${colours[s]}`}>{labels[s]}</span>
        ))}
        {absence && <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[11px] font-semibold text-amber-800">{absence}</span>}
        {active.length === 0 && !absence && (
          <span className="text-[11px] text-muted">{visitCount > 0 ? `${visitCount} visits` : "—"}</span>
        )}
      </summary>
      <div className="absolute left-0 top-full z-20 mt-1 w-40 space-y-1 rounded-md border border-border bg-surface p-2 shadow-md">
        {all.map((s) => {
          const on = active.includes(s);
          return (
            <button
              key={s}
              type="button"
              disabled={isPending}
              onClick={() => startTransition(() => setDayStatus(staffId, dateKey, s, !on))}
              className={`flex w-full items-center justify-between rounded px-2 py-1 text-left text-xs font-medium disabled:opacity-60 ${
                on ? colours[s] : "bg-paper text-ink hover:bg-gray-100"
              }`}
            >
              {labels[s]}
              <span>{on ? "✓" : ""}</span>
            </button>
          );
        })}
      </div>
    </details>
  );
}
