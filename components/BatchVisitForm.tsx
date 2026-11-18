"use client";

import { useMemo, useState, useTransition } from "react";
import { addVisitsBatch, deleteVisit, updateVisitTime } from "@/lib/actions";

type Opt = { id: string; name: string };
type ExistingVisit = {
  id: string;
  staff_member_id: string;
  visit_date: string;
  patient_name: string;
  scheduled_time: string | null;
  end_time: string | null;
  tags: string[];
};
type Draft = { key: number; patientId: string; start: string; end: string; tags: string[] };

const tagOptions: { value: string; label: string }[] = [
  { value: "duschen", label: "Duschen" },
  { value: "betreuung", label: "Betreuung" },
  { value: "arzt", label: "Arzt" },
  { value: "termin", label: "Termin" },
  { value: "kkh", label: "KKH" },
];

function mins(t: string): number | null {
  if (!t) return null;
  const [h, m] = t.slice(0, 5).split(":").map(Number);
  return h * 60 + m;
}
function overlaps(a: [number, number], b: [number, number]) {
  return a[0] < b[1] && b[0] < a[1];
}

type DueInfo = { patientId: string; name: string; kind: "care" | "cleaning"; required: number; assigned: number; skipped: boolean };

export default function BatchVisitForm({
  staff,
  patients,
  existing,
  weekDates,
  due,
}: {
  due: Record<string, DueInfo[]>;
  staff: Opt[];
  patients: Opt[];
  existing: ExistingVisit[];
  weekDates: { key: string; label: string }[];
}) {
  const [staffId, setStaffId] = useState(staff[0]?.id ?? "");
  const [date, setDate] = useState(weekDates[0]?.key ?? "");
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [counter, setCounter] = useState(1);
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editStart, setEditStart] = useState("");
  const [editEnd, setEditEnd] = useState("");

  const nameOf = (id: string) => patients.find((p) => p.id === id)?.name ?? "—";

  const day = useMemo(
    () => existing.filter((v) => v.staff_member_id === staffId && v.visit_date === date),
    [existing, staffId, date]
  );

  // Preview: what is already planned plus the new rows, in time order.
  const preview = useMemo(() => {
    const rows = [
      ...day.map((v) => ({
        label: v.patient_name,
        start: v.scheduled_time?.slice(0, 5) ?? "",
        end: v.end_time?.slice(0, 5) ?? "",
        tags: v.tags,
        isNew: false,
        id: v.id as string | undefined,
        key: `e-${v.id}`,
      })),
      ...drafts
        .filter((d) => d.patientId)
        .map((d) => ({ label: nameOf(d.patientId), start: d.start, end: d.end, tags: d.tags, isNew: true, id: undefined as string | undefined, key: `d-${d.key}` })),
    ];
    rows.sort((a, b) => (a.start || "99").localeCompare(b.start || "99"));
    return rows.map((r, i) => {
      const w: [number, number] | null = mins(r.start) !== null ? [mins(r.start)!, mins(r.end) ?? mins(r.start)! + 5] : null;
      const clash =
        r.isNew && w
          ? rows.some((o, j) => {
              if (i === j) return false;
              const ow: [number, number] | null = mins(o.start) !== null ? [mins(o.start)!, mins(o.end) ?? mins(o.start)! + 5] : null;
              return ow ? overlaps(w, ow) : false;
            })
          : false;
      return { ...r, clash };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [day, drafts]);

  // Clients due on the chosen day (from the weekly list). Fully planned ones are marked and cannot be picked twice.
  const dueToday = due[date] ?? [];
  const draftCount = (pid: string) => drafts.filter((d) => d.patientId === pid).length;
  const useFilter = !showAll && dueToday.length > 0;
  const optionFor = (p: Opt) => {
    const d = dueToday.find((x) => x.patientId === p.id && x.kind === "care") ?? dueToday.find((x) => x.patientId === p.id);
    if (!d) return { label: p.name, disabled: false, hide: useFilter };
    const done = d.assigned + draftCount(p.id) >= d.required;
    return {
      label: `${done ? "✓ " : ""}${p.name}${d.required > 1 ? ` (${Math.min(d.assigned + draftCount(p.id), d.required)}/${d.required})` : ""}${done ? " – assigned" : ""}`,
      disabled: false,
      hide: false,
    };
  };

  function addRow() {
    setDrafts((d) => [...d, { key: counter, patientId: "", start: "", end: "", tags: [] }]);
    setCounter((c) => c + 1);
  }
  function update(key: number, patch: Partial<Draft>) {
    setDrafts((d) => d.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  }
  function toggleTag(key: number, tag: string) {
    setDrafts((d) =>
      d.map((r) => (r.key === key ? { ...r, tags: r.tags.includes(tag) ? r.tags.filter((t) => t !== tag) : [...r.tags, tag] } : r))
    );
  }

  const valid = drafts.filter((d) => d.patientId && d.start);
  const incomplete = drafts.length - valid.length;
  const clashes = preview.filter((p) => p.clash).length;

  function confirm() {
    setMessage(null);
    startTransition(async () => {
      try {
        await addVisitsBatch(staffId, date, valid.map((d) => ({ patientId: d.patientId, start: d.start, end: d.end, tags: d.tags })));
        setMessage(`${valid.length} visit${valid.length === 1 ? "" : "s"} added.`);
        setDrafts([]);
      } catch {
        setMessage("Adding failed. Please try again or check the server log.");
      }
    });
  }

  const inputClass = "w-full rounded-md border border-border bg-surface px-2 py-1.5 text-sm text-ink focus:border-brand";

  return (
    <div className="rounded-lg border border-border bg-surface p-5">
      <h2 className="text-base font-semibold text-ink">Add visits</h2>
      <p className="mt-1 text-xs text-muted">Choose a carer and a day, see what is already planned, add as many visits as you need, then confirm them all at once.</p>

      <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-4">
        <label className="text-sm font-medium text-ink">
          Carer
          <select className={`${inputClass} mt-1.5`} value={staffId} onChange={(e) => { setStaffId(e.target.value); }}>
            {staff.map((s) => (<option key={s.id} value={s.id}>{s.name}</option>))}
          </select>
        </label>
        <label className="text-sm font-medium text-ink">
          Day
          <select className={`${inputClass} mt-1.5`} value={date} onChange={(e) => setDate(e.target.value)}>
            {weekDates.map((d) => (<option key={d.key} value={d.key}>{d.label}</option>))}
          </select>
        </label>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <div>
          <h3 className="mb-2 text-sm font-medium text-ink">New visits</h3>
          {dueToday.length > 0 && (
            <label className="mb-2 flex items-center gap-2 text-xs text-muted">
              <input type="checkbox" checked={showAll} onChange={(e) => setShowAll(e.target.checked)} />
              Show all clients (otherwise only the {dueToday.length} due on this day)
            </label>
          )}
          <div className="space-y-2">
            {drafts.map((d) => (
              <div key={d.key} className="rounded-md border border-border p-2">
                <div className="grid grid-cols-[1fr_90px_90px_auto] items-center gap-2">
                  <select className={inputClass} value={d.patientId} onChange={(e) => update(d.key, { patientId: e.target.value })}>
                    <option value="">— client —</option>
                    {patients.map((p) => {
                      const o = optionFor(p);
                      return o.hide ? null : <option key={p.id} value={p.id}>{o.label}</option>;
                    })}
                  </select>
                  <input type="time" className={inputClass} value={d.start} onChange={(e) => update(d.key, { start: e.target.value })} />
                  <input type="time" className={inputClass} value={d.end} onChange={(e) => update(d.key, { end: e.target.value })} />
                  <button type="button" onClick={() => setDrafts((x) => x.filter((r) => r.key !== d.key))} className="text-xs text-muted hover:text-ink">Remove</button>
                </div>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {tagOptions.map((t) => (
                    <button
                      key={t.value}
                      type="button"
                      onClick={() => toggleTag(d.key, t.value)}
                      className={`rounded-full border px-2 py-0.5 text-[11px] ${d.tags.includes(t.value) ? "border-brand bg-brand text-white" : "border-border text-ink hover:bg-paper"}`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <button type="button" onClick={addRow} className="mt-3 rounded-md border border-border px-3 py-1.5 text-sm font-medium text-ink hover:bg-paper">+ Add a row</button>
        </div>

        <div>
          <h3 className="mb-2 text-sm font-medium text-ink">
            Preview — {staff.find((s) => s.id === staffId)?.name}, {weekDates.find((d) => d.key === date)?.label}
          </h3>
          <ul className="space-y-1 rounded-md border border-border bg-paper p-2 text-sm">
            {preview.length === 0 && <li className="px-1 py-2 text-muted">Nothing planned on this day yet.</li>}
            {preview.map((r) => (
              <li
                key={r.key}
                className={`rounded px-2 py-1 ${r.isNew ? (r.clash ? "bg-red-100 text-red-900" : "bg-emerald-100 text-emerald-900") : "text-ink"}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span>
                    {r.label}
                    {r.tags.length > 0 && <span className="ml-1 text-[11px] text-muted">{r.tags.join(", ")}</span>}
                  </span>
                  <span className="flex items-center gap-2 text-xs">
                    {r.start || "no time"}{r.end ? `–${r.end}` : ""}{r.isNew ? "  · new" : ""}
                    {!r.isNew && r.id && (
                      <>
                        <button
                          type="button"
                          className="text-muted hover:text-ink"
                          onClick={() => {
                            setEditingId(r.id!);
                            setEditStart(r.start);
                            setEditEnd(r.end);
                          }}
                        >
                          Edit time
                        </button>
                        <button
                          type="button"
                          disabled={isPending}
                          className="text-muted hover:text-red-700"
                          onClick={() => {
                            if (window.confirm(`Remove ${r.label} from this day?`)) startTransition(() => deleteVisit(r.id!));
                          }}
                        >
                          Remove
                        </button>
                      </>
                    )}
                  </span>
                </div>
                {editingId === r.id && (
                  <div className="mt-1 flex items-center gap-2">
                    <input type="time" className="rounded border border-border bg-surface px-1.5 py-1 text-xs" value={editStart} onChange={(e) => setEditStart(e.target.value)} />
                    <input type="time" className="rounded border border-border bg-surface px-1.5 py-1 text-xs" value={editEnd} onChange={(e) => setEditEnd(e.target.value)} />
                    <button
                      type="button"
                      disabled={isPending}
                      className="rounded bg-brand px-2 py-1 text-xs text-white"
                      onClick={() => startTransition(async () => { await updateVisitTime(r.id!, editStart, editEnd); setEditingId(null); })}
                    >
                      Save
                    </button>
                    <button type="button" className="text-xs text-muted" onClick={() => setEditingId(null)}>Cancel</button>
                  </div>
                )}
              </li>
            ))}
          </ul>
          {clashes > 0 && <p className="mt-2 text-xs font-medium text-red-700">{clashes} new visit{clashes === 1 ? "" : "s"} overlap another visit (shown in red). You can still add them.</p>}
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={confirm}
          disabled={isPending || valid.length === 0}
          className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-dark disabled:opacity-50"
        >
          {isPending ? "Adding…" : `Confirm ${valid.length} visit${valid.length === 1 ? "" : "s"}`}
        </button>
        {incomplete > 0 && <span className="text-xs text-muted">{incomplete} row{incomplete === 1 ? "" : "s"} without client or start time will be skipped.</span>}
        {message && <span className="text-sm text-muted">{message}</span>}
      </div>
    </div>
  );
}
