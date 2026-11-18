"use client";

import { useTransition } from "react";
import { assignVisitToStaff } from "@/lib/actions";

export default function AssignButton({ visitId, staffId, label }: { visitId: string; staffId: string; label: string }) {
  const [isPending, startTransition] = useTransition();
  return (
    <button
      onClick={() => startTransition(() => assignVisitToStaff(visitId, staffId))}
      disabled={isPending}
      className="rounded-md border border-border bg-surface px-2.5 py-1 text-xs font-medium text-ink hover:bg-paper disabled:opacity-60"
    >
      {isPending ? "…" : `Assign to ${label}`}
    </button>
  );
}
