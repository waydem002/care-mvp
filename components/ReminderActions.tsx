"use client";

import { useTransition } from "react";
import { markReminderSent, confirmReminder, markReminderMissed } from "@/lib/actions";
import type { ReminderStatus } from "@/lib/types";

export default function ReminderActions({ id, status }: { id: string; status: ReminderStatus }) {
  const [isPending, startTransition] = useTransition();

  const buttonClass =
    "rounded-md border border-border px-2.5 py-1 text-xs font-medium text-ink transition-colors hover:bg-paper disabled:opacity-40";

  return (
    <div className="flex gap-1.5">
      {status === "pending" && (
        <button
          className={buttonClass}
          disabled={isPending}
          onClick={() => startTransition(() => markReminderSent(id))}
        >
          Mark sent
        </button>
      )}
      {(status === "pending" || status === "sent") && (
        <button
          className={buttonClass}
          disabled={isPending}
          onClick={() => startTransition(() => confirmReminder(id))}
        >
          Confirm taken
        </button>
      )}
      {status !== "missed" && status !== "confirmed" && (
        <button
          className={buttonClass}
          disabled={isPending}
          onClick={() => startTransition(() => markReminderMissed(id))}
        >
          Mark missed
        </button>
      )}
    </div>
  );
}
