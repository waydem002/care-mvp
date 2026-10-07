"use client";

import { useState, useTransition } from "react";
import { searchDocuments, type SearchOutcome } from "@/lib/documents";

const categoryLabels: Record<string, string> = {
  policy: "Policy",
  procedure: "Procedure",
  general: "General",
  patient_note: "Patient note",
};

export default function DocumentSearch() {
  const [query, setQuery] = useState("");
  const [outcome, setOutcome] = useState<SearchOutcome | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const result = await searchDocuments(query);
      setOutcome(result);
    });
  }

  return (
    <div className="rounded-lg border border-border bg-surface p-5">
      <h2 className="mb-3 text-base font-semibold text-ink">Search documents</h2>
      <form onSubmit={handleSearch} className="mb-4 flex gap-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="e.g. Verbandswechsel, Notfallkontakte, Urlaubsregelung..."
          className="flex-1 rounded-md border border-border bg-paper px-3 py-2 text-sm text-ink focus:border-brand"
        />
        <button
          type="submit"
          disabled={isPending}
          className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-dark disabled:opacity-60"
        >
          {isPending ? "Searching…" : "Search"}
        </button>
      </form>

      {outcome?.mode === "text_fallback" && (
        <p className="mb-3 rounded-md bg-status-pendingBg px-3 py-2 text-xs text-status-pending">{outcome.note}</p>
      )}
      {outcome?.mode === "error" && (
        <p className="mb-3 rounded-md bg-status-missedBg px-3 py-2 text-xs text-status-missed">{outcome.message}</p>
      )}

      {outcome && outcome.mode !== "error" && (
        <div className="space-y-2">
          {outcome.results.length === 0 && (
            <p className="text-sm text-muted">No matching documents found.</p>
          )}
          {outcome.results.map((r) => (
            <div key={r.chunkId} className="rounded-md border border-border bg-paper p-3">
              <div className="mb-1 flex items-center justify-between">
                <p className="text-sm font-medium text-ink">{r.documentTitle}</p>
                <span className="text-xs text-muted">{categoryLabels[r.documentCategory] ?? r.documentCategory}</span>
              </div>
              <p className="text-sm text-ink">{r.content}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
