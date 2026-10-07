"use client";

import { useState, useTransition } from "react";
import {
  exportPatientData,
  requestPatientDeletion,
  completeDeletionRequest,
  rejectDeletionRequest,
} from "@/lib/actions";
import type { Consent, DeletionRequest, AuditLogEntry } from "@/lib/types";

const consentLabels: Record<string, string> = {
  data_processing: "Data processing",
  whatsapp_communication: "WhatsApp communication",
  family_portal_sharing: "Family portal sharing",
};

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("de-DE", { dateStyle: "medium", timeStyle: "short" });
}

export default function DsgvoPanel({
  patientId,
  patientName,
  consents,
  deletionRequests,
  auditLog,
}: {
  patientId: string;
  patientName: string;
  consents: Consent[];
  deletionRequests: DeletionRequest[];
  auditLog: AuditLogEntry[];
}) {
  const [isPending, startTransition] = useTransition();
  const [reason, setReason] = useState("");
  const [showDeletionForm, setShowDeletionForm] = useState(false);
  const [showAuditLog, setShowAuditLog] = useState(false);

  const pendingRequest = deletionRequests.find((r) => r.status === "pending");

  async function handleExport() {
    const data = await exportPatientData(patientId);
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${patientName.replace(/\s+/g, "_")}_data_export.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleRequestDeletion() {
    startTransition(async () => {
      await requestPatientDeletion(patientId, reason);
      setShowDeletionForm(false);
      setReason("");
    });
  }

  const buttonClass =
    "rounded-md border border-border px-3 py-1.5 text-xs font-medium text-ink transition-colors hover:bg-paper disabled:opacity-40";

  return (
    <div className="rounded-lg border border-border bg-surface p-5">
      <h2 className="mb-3 text-sm font-semibold text-ink">DSGVO / GDPR</h2>

      <div className="mb-4">
        <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-muted">Consent on file</p>
        <div className="flex flex-wrap gap-1.5">
          {consents.length === 0 && <span className="text-sm text-muted">None recorded.</span>}
          {consents.map((c) => (
            <span
              key={c.id}
              className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                c.granted ? "bg-status-confirmedBg text-status-confirmed" : "bg-status-missedBg text-status-missed"
              }`}
            >
              {consentLabels[c.consent_type] ?? c.consent_type}
            </span>
          ))}
        </div>
      </div>

      {pendingRequest && (
        <div className="mb-4 rounded-md border border-status-pending/40 bg-status-pendingBg px-3 py-2.5">
          <p className="text-sm font-medium text-ink">Deletion requested {formatDateTime(pendingRequest.requested_at)}</p>
          {pendingRequest.reason && <p className="mt-0.5 text-sm text-muted">Reason: {pendingRequest.reason}</p>}
          <div className="mt-2 flex gap-1.5">
            <button
              className="rounded-md bg-status-missed px-3 py-1.5 text-xs font-medium text-white hover:opacity-90 disabled:opacity-40"
              disabled={isPending}
              onClick={() => startTransition(() => completeDeletionRequest(pendingRequest.id, patientId))}
            >
              Complete deletion
            </button>
            <button
              className={buttonClass}
              disabled={isPending}
              onClick={() => startTransition(() => rejectDeletionRequest(pendingRequest.id, patientId))}
            >
              Reject request
            </button>
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <button className={buttonClass} onClick={handleExport}>
          Export patient data
        </button>
        {!pendingRequest && (
          <button className={buttonClass} onClick={() => setShowDeletionForm((s) => !s)}>
            Request deletion
          </button>
        )}
        <button className={buttonClass} onClick={() => setShowAuditLog((s) => !s)}>
          {showAuditLog ? "Hide" : "Show"} audit trail
        </button>
      </div>

      {showDeletionForm && !pendingRequest && (
        <div className="mt-3 space-y-2">
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Reason for deletion request (optional)"
            rows={2}
            className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-ink focus:border-brand"
          />
          <button
            className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-dark disabled:opacity-60"
            disabled={isPending}
            onClick={handleRequestDeletion}
          >
            {isPending ? "Submitting…" : "Submit deletion request"}
          </button>
        </div>
      )}

      {showAuditLog && (
        <div className="mt-4 space-y-1.5 border-t border-border pt-3">
          {auditLog.length === 0 && <p className="text-sm text-muted">No changes recorded yet.</p>}
          {auditLog.map((entry) => (
            <div key={entry.id} className="text-xs text-muted">
              <span className="font-medium text-ink">{entry.action}</span> on {entry.table_name} ·{" "}
              {formatDateTime(entry.created_at)}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
