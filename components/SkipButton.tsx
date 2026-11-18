"use client";

import { useTransition } from "react";
import { skipClientWeek } from "@/lib/actions";

export default function SkipButton({ patientId, weekStartKey, undo }: { patientId: string; weekStartKey: string; undo?: boolean }) {
  const [isPending, startTransition] = useTransition();
  return (
    <button
      type="button"
      disabled={isPending}
      onClick={() => startTransition(() => skipClientWeek(patientId, weekStartKey, !undo))}
      className="rounded-md border border-border bg-surface px-2 py-0.5 text-[11px] font-medium text-ink hover:bg-paper disabled:opacity-60"
    >
      {undo ? "Undo" : "Not this week"}
    </button>
  );
}
