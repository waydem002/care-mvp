"use client";

import { useTransition } from "react";
import { generateTodayReminders } from "@/lib/actions";

export default function GenerateRemindersButton() {
  const [isPending, startTransition] = useTransition();

  return (
    <button
      onClick={() => startTransition(() => generateTodayReminders())}
      disabled={isPending}
      className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-dark disabled:opacity-60"
    >
      {isPending ? "Generating…" : "Generate today's reminders"}
    </button>
  );
}
