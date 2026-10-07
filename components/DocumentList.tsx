"use client";

import { useTransition } from "react";
import { deleteDocument, getDocumentDownloadUrl } from "@/lib/documents";
import type { Document } from "@/lib/types";

const categoryLabels: Record<string, string> = {
  policy: "Policy",
  procedure: "Procedure",
  general: "General",
  patient_note: "Patient note",
};

export default function DocumentList({ documents }: { documents: Document[] }) {
  const [isPending, startTransition] = useTransition();

  if (documents.length === 0) {
    return <p className="text-sm text-muted">No documents yet — add the first one above.</p>;
  }

  const byFolder = new Map<string, Document[]>();
  for (const doc of documents) {
    if (!byFolder.has(doc.folder)) byFolder.set(doc.folder, []);
    byFolder.get(doc.folder)!.push(doc);
  }

  async function handleDownload(documentId: string) {
    try {
      const url = await getDocumentDownloadUrl(documentId);
      window.open(url, "_blank");
    } catch (e) {
      alert(e instanceof Error ? e.message : "Couldn't generate a download link.");
    }
  }

  return (
    <div className="space-y-5">
      {Array.from(byFolder.entries()).map(([folder, docs]) => (
        <div key={folder}>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
            {folder} ({docs.length})
          </p>
          <div className="space-y-2">
            {docs.map((doc) => (
              <div key={doc.id} className="flex items-start justify-between gap-3 rounded-md border border-border bg-surface p-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-ink">{doc.title}</p>
                  <p className="text-xs text-muted">
                    {categoryLabels[doc.category] ?? doc.category}
                    {doc.file_name && <> · {doc.file_name}</>}
                    {doc.patient_name && <> · linked to {doc.patient_name}</>}
                  </p>
                </div>
                <div className="flex shrink-0 gap-3">
                  {doc.file_path && (
                    <button
                      onClick={() => handleDownload(doc.id)}
                      className="text-xs text-brand hover:underline"
                    >
                      Download
                    </button>
                  )}
                  <button
                    disabled={isPending}
                    onClick={() => startTransition(() => deleteDocument(doc.id))}
                    className="text-xs text-muted hover:text-status-missed disabled:opacity-40"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
