"use client";

import { useTransition } from "react";
import { toggleEveningDuty } from "@/lib/actions";

// Free choice of the evening team for one day: click a name to put that carer on / off evening duty.
export default function EveningTeam({
  dateKey,
  staff,
  onDuty,
}: {
  dateKey: string;
  staff: { id: string; name: string }[];
  onDuty: string[]; // staff ids currently on evening duty that day
}) {
  const [isPending, startTransition] = useTransition();
  return (
    <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted">
      <span>Evening duty:</span>
      {staff.map((s) => {
        const active = onDuty.includes(s.id);
        return (
          <button
            key={s.id}
            type="button"
            disabled={isPending}
            onClick={() => startTransition(() => toggleEveningDuty(s.id, dateKey, !active))}
            className={`rounded-full border px-2 py-0.5 text-[11px] font-medium transition-colors disabled:opacity-60 ${
              active ? "border-brand bg-brand text-white" : "border-border bg-surface text-ink hover:bg-paper"
            }`}
          >
            {s.name}
          </button>
        );
      })}
    </div>
  );
}
