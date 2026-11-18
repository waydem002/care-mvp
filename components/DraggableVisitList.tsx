"use client";

import { useEffect, useState, useTransition } from "react";
import { reorderVisits } from "@/lib/actions";
import VisitCard from "@/components/VisitCard";
import type { Visit } from "@/lib/types";

// One carer's visits for one day. Drag a card to a new spot and release:
// the new order is saved straight away.
export default function DraggableVisitList({
  staffId,
  visitDate,
  visits,
}: {
  staffId: string;
  visitDate: string;
  visits: Visit[];
}) {
  const [items, setItems] = useState(visits);
  const [dragId, setDragId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  // Keep in sync when the server sends fresh data (after save, delete, generate…).
  useEffect(() => setItems(visits), [visits]);

  function handleDrop(targetId: string) {
    if (!dragId || dragId === targetId) return reset();
    const from = items.findIndex((v) => v.id === dragId);
    const to = items.findIndex((v) => v.id === targetId);
    if (from < 0 || to < 0) return reset();

    const next = [...items];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    setItems(next);
    reset();
    startTransition(() => reorderVisits(staffId, visitDate, next.map((v) => v.id)));
  }

  function reset() {
    setDragId(null);
    setOverId(null);
  }

  return (
    <div className="space-y-1.5">
      {items.map((v, index) => (
        <div
          key={v.id}
          draggable
          onDragStart={(e) => {
            setDragId(v.id);
            e.dataTransfer.effectAllowed = "move";
            e.dataTransfer.setData("application/x-visit", JSON.stringify({ id: v.id, date: visitDate }));
          }}
          onDragOver={(e) => {
            e.preventDefault();
            setOverId(v.id);
          }}
          onDrop={(e) => {
            // Same-day reorder is handled here; a drop from another day bubbles up to the day card.
            if (dragId) {
              e.stopPropagation();
              handleDrop(v.id);
            }
          }}
          onDragEnd={reset}
          className={`cursor-grab rounded-md active:cursor-grabbing ${
            dragId === v.id ? "opacity-40" : ""
          } ${overId === v.id && dragId !== v.id ? "ring-2 ring-brand" : ""}`}
        >
          <VisitCard visit={v} position={index + 1} />
        </div>
      ))}
    </div>
  );
}
