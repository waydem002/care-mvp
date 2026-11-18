"use client";

import { useState, useTransition } from "react";
import { moveVisitToDate } from "@/lib/actions";

// Wraps one day card. Dropping a dragged visit here moves it to this day.
export default function DayDropZone({ dateKey, children }: { dateKey: string; children: React.ReactNode }) {
  const [over, setOver] = useState(false);
  const [, startTransition] = useTransition();

  return (
    <div
      onDragOver={(e) => {
        if (e.dataTransfer.types.includes("application/x-visit")) {
          e.preventDefault();
          setOver(true);
        }
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        setOver(false);
        const raw = e.dataTransfer.getData("application/x-visit");
        if (!raw) return;
        e.preventDefault();
        const { id, date } = JSON.parse(raw) as { id: string; date: string };
        if (date !== dateKey) startTransition(() => moveVisitToDate(id, dateKey));
      }}
      className={`overflow-hidden rounded-lg border bg-surface ${over ? "border-brand ring-2 ring-brand" : "border-border"}`}
    >
      {children}
    </div>
  );
}
