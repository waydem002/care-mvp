"use client";

export default function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-dark"
    >
      Download as PDF
    </button>
  );
}
