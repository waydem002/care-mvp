"use client";

import { useRef, useTransition } from "react";
import { addDocument } from "@/lib/documents";
import type { Patient } from "@/lib/types";

export default function DocumentForm({ patients, folders }: { patients: Patient[]; folders: string[] }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [isPending, startTransition] = useTransition();
  const errorRef = useRef<HTMLParagraphElement>(null);

  function handleSubmit(formData: FormData) {
    if (errorRef.current) errorRef.current.textContent = "";
    startTransition(async () => {
      try {
        await addDocument(formData);
        formRef.current?.reset();
      } catch (e) {
        if (errorRef.current) {
          errorRef.current.textContent = e instanceof Error ? e.message : "Something went wrong.";
        }
      }
    });
  }

  const inputClass =
    "w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-ink focus:border-brand";
  const labelClass = "mb-1.5 block text-sm font-medium text-ink";

  return (
    <form ref={formRef} action={handleSubmit} className="grid grid-cols-1 gap-4 rounded-lg border border-border bg-surface p-5 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <h2 className="text-base font-semibold text-ink">Add document</h2>
      </div>

      <div>
        <label className={labelClass} htmlFor="title">Title</label>
        <input id="title" name="title" required className={inputClass} placeholder="Verbandswechsel Protokoll" />
      </div>

      <div>
        <label className={labelClass} htmlFor="category">Category</label>
        <select id="category" name="category" className={inputClass} defaultValue="general">
          <option value="policy">Policy</option>
          <option value="procedure">Procedure</option>
          <option value="general">General</option>
          <option value="patient_note">Patient note</option>
        </select>
      </div>

      <div>
        <label className={labelClass} htmlFor="folder">Folder</label>
        <input
          id="folder"
          name="folder"
          list="folder-options"
          defaultValue="General"
          className={inputClass}
          placeholder="e.g. Finance, HR, Care Procedures"
        />
        <datalist id="folder-options">
          {folders.map((f) => (
            <option key={f} value={f} />
          ))}
        </datalist>
        <p className="mt-1 text-xs text-muted">Pick an existing folder or type a new one.</p>
      </div>

      <div>
        <label className={labelClass} htmlFor="patient_id">Link to patient (optional)</label>
        <select id="patient_id" name="patient_id" className={inputClass} defaultValue="">
          <option value="">Not linked to a patient</option>
          {patients.map((p) => (
            <option key={p.id} value={p.id}>{p.full_name}</option>
          ))}
        </select>
      </div>

      <div className="sm:col-span-2">
        <label className={labelClass} htmlFor="file">Upload a file (PDF or .txt)</label>
        <input id="file" name="file" type="file" accept=".pdf,.txt,application/pdf,text/plain" className={inputClass} />
        <p className="mt-1 text-xs text-muted">
          PDFs are automatically text-extracted for search. Max 10MB. Scanned image-only PDFs won't have extractable text.
        </p>
      </div>

      <div className="sm:col-span-2">
        <label className={labelClass} htmlFor="content">Or paste content directly</label>
        <textarea id="content" name="content" rows={5} className={inputClass} placeholder="Paste or write text here instead of uploading a file..." />
      </div>

      <p ref={errorRef} className="sm:col-span-2 text-sm text-status-missed" />

      <div className="sm:col-span-2">
        <button
          type="submit"
          disabled={isPending}
          className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-dark disabled:opacity-60"
        >
          {isPending ? "Saving…" : "Add document"}
        </button>
      </div>
    </form>
  );
}
