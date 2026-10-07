"use client";

import { useState, useTransition } from "react";
import { updateBookingRequestStatus, updateBookingRequestNotes } from "@/lib/actions";
import type { BookingRequest } from "@/lib/types";

const requestTypeLabels: Record<string, string> = {
  consultation: "Consultation",
  schedule_change: "Schedule change",
  extra_visit: "Extra visit",
  callback: "Callback request",
  other: "Other",
};

const statusStyles: Record<string, string> = {
  pending: "bg-status-pendingBg text-status-pending",
  approved: "bg-status-confirmedBg text-status-confirmed",
  rejected: "bg-status-missedBg text-status-missed",
  completed: "bg-border text-ink",
};

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("de-DE", { dateStyle: "medium", timeStyle: "short" });
}

export default function BookingRequestCard({ request }: { request: BookingRequest }) {
  const [isPending, startTransition] = useTransition();
  const [notes, setNotes] = useState(request.admin_notes ?? "");

  const buttonClass =
    "rounded-md border border-border px-2.5 py-1 text-xs font-medium text-ink hover:bg-paper disabled:opacity-40";

  return (
    <div className="rounded-lg border border-border bg-surface p-4">
      <div className="mb-2 flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-medium text-ink">{request.requester_name}</p>
          <p className="text-xs text-muted">
            {requestTypeLabels[request.request_type] ?? request.request_type} · {formatDateTime(request.created_at)}
          </p>
        </div>
        <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${statusStyles[request.status]}`}>
          {request.status}
        </span>
      </div>

      <div className="mb-3 grid grid-cols-2 gap-x-4 gap-y-1 text-sm text-ink">
        {request.requester_phone && <p><span className="text-muted">Phone:</span> {request.requester_phone}</p>}
        {request.requester_email && <p><span className="text-muted">Email:</span> {request.requester_email}</p>}
        {request.patient_name && <p><span className="text-muted">Patient:</span> {request.patient_name}</p>}
        {request.preferred_date && <p><span className="text-muted">Preferred:</span> {request.preferred_date}</p>}
      </div>

      {request.message && <p className="mb-3 rounded-md bg-paper px-3 py-2 text-sm text-ink">{request.message}</p>}

      <div className="mb-3 flex flex-wrap gap-1.5">
        {request.status !== "approved" && (
          <button
            disabled={isPending}
            onClick={() => startTransition(() => updateBookingRequestStatus(request.id, "approved"))}
            className={buttonClass}
          >
            Approve
          </button>
        )}
        {request.status !== "rejected" && (
          <button
            disabled={isPending}
            onClick={() => startTransition(() => updateBookingRequestStatus(request.id, "rejected"))}
            className={buttonClass}
          >
            Reject
          </button>
        )}
        {request.status !== "completed" && (
          <button
            disabled={isPending}
            onClick={() => startTransition(() => updateBookingRequestStatus(request.id, "completed"))}
            className={buttonClass}
          >
            Mark completed
          </button>
        )}
      </div>

      <div className="flex gap-2">
        <input
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Internal notes..."
          className="flex-1 rounded-md border border-border bg-paper px-2.5 py-1.5 text-xs text-ink focus:border-brand"
        />
        <button
          disabled={isPending}
          onClick={() => startTransition(() => updateBookingRequestNotes(request.id, notes))}
          className={buttonClass}
        >
          Save
        </button>
      </div>
    </div>
  );
}
