import Link from "next/link";
import { getVisitsForWeek, getStaffMembers, getPatients, getTourDayStatusForWeek, getAbsences, getClientSchedule, getScheduleSkips } from "@/lib/queries";
import { computeDue } from "@/lib/schedule";
import SkipButton from "@/components/SkipButton";
import { findGaps, carersWithoutWeekdayOff } from "@/lib/coverage";
import EveningTeam from "@/components/EveningTeam";
import AssignButton from "@/components/AssignButton";
import { PlanOptionsProvider } from "@/components/PlanOptions";
import DayDropZone from "@/components/DayDropZone";
import { deleteDayStatus } from "@/lib/actions";
import GenerateWeekButton from "@/components/GenerateWeekButton";
import { getWeekStart, getWeekDates, toDateKey } from "@/lib/calendar";
import BatchVisitForm from "@/components/BatchVisitForm";
import DraggableVisitList from "@/components/DraggableVisitList";
import type { Visit } from "@/lib/types";

const weekdayNames = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

export default async function ToursPage({
  searchParams,
}: {
  searchParams: { week?: string };
}) {
  const referenceDate = searchParams.week ? new Date(searchParams.week) : new Date();
  const weekStart = getWeekStart(referenceDate);
  const weekDates = getWeekDates(weekStart);

  const startKey = toDateKey(weekDates[0]);
  const endKey = toDateKey(weekDates[6]);

  const [visits, staff, patients, dayStatus, absences, schedule, skips] = await Promise.all([
    getVisitsForWeek(startKey, endKey),
    getStaffMembers(),
    getPatients(),
    getTourDayStatusForWeek(startKey, endKey),
    getAbsences(startKey, endKey),
    getClientSchedule(),
    getScheduleSkips(startKey),
  ]);

  const patientNames = new Map(patients.map((p) => [p.id, p.full_name]));
  const dueByDate = computeDue(weekDates.map((d) => toDateKey(d)), schedule.rows, visits, skips, patientNames);
  const missingByDate = Object.entries(dueByDate)
    .map(([date, items]) => [date, items.filter((i) => !i.skipped && i.assigned < i.required)] as const)
    .filter(([, items]) => items.length > 0);
  const missingTotal = missingByDate.reduce((n, [, items]) => n + items.length, 0);
  const skippedClients = patients.filter((p) => skips.includes(p.id));

  const gaps = findGaps(visits, staff, absences, dayStatus);
  const noRest = carersWithoutWeekdayOff(staff, absences, dayStatus, weekDates.slice(0, 5).map((d) => toDateKey(d)));
  const eveningStaff = staff
    .filter((x) => x.active && x.staff_type === "care")
    .map((x) => ({ id: x.id, name: x.full_name }));
  const careGaps = gaps.filter((g) => !g.isCleaning);
  const cleaningGaps = gaps.filter((g) => g.isCleaning);
  const fmtDay = (k: string) => new Date(k).toLocaleDateString("de-DE", { weekday: "short", day: "2-digit", month: "2-digit" });
  const fmtTime = (v: Visit) =>
    v.scheduled_time ? `${v.scheduled_time.slice(0, 5)}${v.end_time ? `–${v.end_time.slice(0, 5)}` : ""}` : "no time";

  const statusByDay = new Map<string, typeof dayStatus>();
  for (const st of dayStatus) {
    if (!statusByDay.has(st.status_date)) statusByDay.set(st.status_date, []);
    statusByDay.get(st.status_date)!.push(st);
  }
  const statusLabel = (st: (typeof dayStatus)[number]) => {
    const labels: Record<string, string> = {
      frei: "FREI",
      fd: "FD (Frühdienst)",
      sd: "SD",
      abenddienst: "Abenddienst",
      buerodienst: "Bürodienst",
    };
    return `${st.staff_name}: ${labels[st.status] ?? st.status}${st.companion_name ? ` (mit ${st.companion_name})` : ""}`;
  };

  const visitsByDay = new Map<string, Visit[]>();
  for (const visit of visits) {
    const key = visit.visit_date;
    if (!visitsByDay.has(key)) visitsByDay.set(key, []);
    visitsByDay.get(key)!.push(visit);
  }

  const prevWeek = new Date(weekStart);
  prevWeek.setDate(prevWeek.getDate() - 7);
  const nextWeek = new Date(weekStart);
  nextWeek.setDate(nextWeek.getDate() + 7);

  return (
    <PlanOptionsProvider
      staff={staff.filter((x) => x.active).map((x) => ({ id: x.id, name: x.full_name }))}
      patients={patients.map((x) => ({ id: x.id, name: x.full_name }))}
    >
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-ink">
          Week of {weekDates[0].toLocaleDateString("de-DE", { day: "numeric", month: "long" })}
        </h1>
        <div className="flex gap-2">
          <Link
            href={`/tours?week=${toDateKey(prevWeek)}`}
            className="rounded-md border border-border px-3 py-1.5 text-sm text-ink hover:bg-paper"
          >
            ← Prev week
          </Link>
          <Link
            href={`/tours?week=${toDateKey(nextWeek)}`}
            className="rounded-md border border-border px-3 py-1.5 text-sm text-ink hover:bg-paper"
          >
            Next week →
          </Link>
        </div>
      </div>

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <Link
          href="/tours/clients"
          className="rounded-md border border-border px-4 py-2 text-sm font-medium text-ink hover:bg-paper"
        >
          Client weekly list
        </Link>
        <Link
          href={`/tours/grid?week=${startKey}`}
          className="rounded-md border border-border px-4 py-2 text-sm font-medium text-ink hover:bg-paper"
        >
          Who works when
        </Link>
        <Link
          href={`/tours/print?week=${startKey}`}
          className="rounded-md border border-border px-4 py-2 text-sm font-medium text-ink hover:bg-paper"
        >
          Print / PDF
        </Link>
        <GenerateWeekButton
          weekStartKey={startKey}
          label={`${weekDates[0].toLocaleDateString("de-DE", { day: "numeric", month: "short" })} – ${weekDates[6].toLocaleDateString("de-DE", { day: "numeric", month: "short" })}`}
        />
      </div>

      {missingTotal > 0 && (
        <div className="mb-6 rounded-lg border border-red-300 bg-red-50 p-4">
          <h2 className="text-sm font-semibold text-ink">
            {missingTotal} client{missingTotal === 1 ? "" : "s"} due this week without a visit
          </h2>
          <p className="mt-1 text-xs text-muted">From the client weekly list. Add the visit, or press &quot;Not this week&quot; (hospital, holiday).</p>
          <ul className="mt-3 space-y-2">
            {missingByDate.map(([date, items]) => (
              <li key={date} className="text-sm text-ink">
                <span className="font-medium">{new Date(date).toLocaleDateString("de-DE", { weekday: "short", day: "2-digit", month: "2-digit" })}:</span>{" "}
                <span className="inline-flex flex-wrap items-center gap-x-3 gap-y-1">
                  {items.map((i) => (
                    <span key={i.patientId + i.kind} className="inline-flex items-center gap-1.5">
                      {i.name}
                      {i.kind === "cleaning" ? " (cleaning)" : ""}
                      {i.required > 1 ? ` ${i.assigned}/${i.required}` : ""}
                      <SkipButton patientId={i.patientId} weekStartKey={startKey} />
                    </span>
                  ))}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {skippedClients.length > 0 && (
        <div className="mb-6 rounded-lg border border-border bg-surface p-3 text-xs text-muted">
          Not this week:{" "}
          {skippedClients.map((c) => (
            <span key={c.id} className="mr-3 inline-flex items-center gap-1.5 text-ink">
              {c.full_name}
              <SkipButton patientId={c.id} weekStartKey={startKey} undo />
            </span>
          ))}
        </div>
      )}

      {noRest.length > 0 && (
        <div className="mb-6 rounded-lg border border-amber-300 bg-amber-50 p-4">
          <h2 className="text-sm font-semibold text-ink">Rest-day rule: no weekday off this week</h2>
          <p className="mt-1 text-sm text-ink">{noRest.map((x) => x.full_name).join(", ")}</p>
          <p className="mt-1 text-xs text-muted">Every carer should have at least one weekday off. Add a FREI day on the Absences page.</p>
        </div>
      )}

      {gaps.length > 0 && (
        <div className="mb-6 rounded-lg border border-amber-300 bg-amber-50 p-4">
          <h2 className="text-sm font-semibold text-ink">
            {gaps.length} visit{gaps.length === 1 ? "" : "s"} without a carer this week
          </h2>
          <p className="mt-1 text-xs text-muted">
            The carer is on holiday, sick or FREI that day. Suggestions show every carer who is working that day and free at that time, lightest day first. You decide who takes it. Check
            qualifications (e.g. medication, insulin) before assigning.
          </p>
          {careGaps.length > 0 && (
            <ul className="mt-3 space-y-2">
              {careGaps.map((g) => (
                <li key={g.visit.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-ink">
                  <span className="font-medium">{fmtDay(g.visit.visit_date)} {fmtTime(g.visit)}</span>
                  <span>{g.visit.patient_name}</span>
                  <span className="text-muted">({g.visit.staff_name}: {g.reason})</span>
                  {g.suggestions.length > 0 ? (
                    g.suggestions.map((s) => (
                      <AssignButton key={s.id} visitId={g.visit.id} staffId={s.id} label={`${s.full_name}${g.knows[s.id] ? " · knows client" : ""} (${g.loads[s.id]} that day)`} />
                    ))
                  ) : (
                    <span className="text-xs font-medium text-red-700">No one available — assign by hand</span>
                  )}
                </li>
              ))}
            </ul>
          )}
          {cleaningGaps.length > 0 && (
            <div className="mt-3 border-t border-amber-200 pt-3">
              <p className="text-xs font-medium text-ink">Cleaning (no replacement)</p>
              <ul className="mt-1 space-y-1 text-sm text-ink">
                {cleaningGaps.map((g) => (
                  <li key={g.visit.id}>
                    {fmtDay(g.visit.visit_date)} {fmtTime(g.visit)} — {g.visit.patient_name}{" "}
                    <span className="text-muted">({g.visit.staff_name}: {g.reason})</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      <div className="mb-8 space-y-4">
        {weekDates.map((day, i) => {
          const key = toDateKey(day);
          const dayVisits = visitsByDay.get(key) ?? [];

          const byStaff = new Map<string, Visit[]>();
          for (const v of dayVisits) {
            if (!byStaff.has(v.staff_name ?? "Unknown")) byStaff.set(v.staff_name ?? "Unknown", []);
            byStaff.get(v.staff_name ?? "Unknown")!.push(v);
          }

          return (
            <DayDropZone key={key} dateKey={key}>
              <div className="border-b border-border bg-paper px-4 py-2.5">
                <h2 className="text-sm font-semibold text-ink">
                  {weekdayNames[i]}, {day.toLocaleDateString("de-DE", { day: "numeric", month: "short" })}
                </h2>
              </div>
              {(statusByDay.get(key) ?? []).length > 0 && (
                <div className="flex flex-wrap gap-1.5 border-b border-border px-4 py-2">
                  {(statusByDay.get(key) ?? []).map((st) => (
                    <span key={st.id} className="inline-flex items-center gap-1 rounded-full bg-paper px-2.5 py-0.5 text-[11px] font-medium text-ink">
                      {statusLabel(st)}
                      <form action={deleteDayStatus.bind(null, st.id)} className="inline">
                        <button type="submit" title="Remove" className="text-muted hover:text-ink">×</button>
                      </form>
                    </span>
                  ))}
                </div>
              )}
              <div className="border-b border-border px-4 py-2">
                <EveningTeam
                  dateKey={key}
                  staff={eveningStaff}
                  onDuty={(statusByDay.get(key) ?? []).filter((x) => x.status === "abenddienst").map((x) => x.staff_member_id)}
                />
              </div>
              {byStaff.size === 0 ? (
                <p className="px-4 py-6 text-center text-sm text-muted">No visits planned.</p>
              ) : (
                <div className="grid grid-cols-1 gap-3 p-4 md:grid-cols-2">
                  {Array.from(byStaff.entries()).map(([staffName, staffVisits]) => (
                    <div key={staffName}>
                      <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-muted">{staffName}</p>
                      <DraggableVisitList staffId={staffVisits[0].staff_member_id} visitDate={key} visits={staffVisits} />
                    </div>
                  ))}
                </div>
              )}
            </DayDropZone>
          );
        })}
      </div>

      <BatchVisitForm
        staff={staff.filter((x) => x.active).map((x) => ({ id: x.id, name: x.full_name }))}
        patients={patients.map((x) => ({ id: x.id, name: x.full_name }))}
        existing={visits.map((v) => ({
          id: v.id,
          staff_member_id: v.staff_member_id,
          visit_date: v.visit_date,
          patient_name: v.patient_name ?? "",
          scheduled_time: v.scheduled_time,
          end_time: v.end_time,
          tags: v.tags ?? [],
        }))}
        due={Object.fromEntries(
          Object.entries(dueByDate).map(([k, items]) => [
            k,
            items.map((i) => ({ patientId: i.patientId, name: i.name, kind: i.kind, required: i.required, assigned: i.assigned, skipped: i.skipped })),
          ])
        )}
        weekDates={weekDates.map((d, i) => ({
          key: toDateKey(d),
          label: `${weekdayNames[i]} ${d.toLocaleDateString("de-DE", { day: "numeric", month: "short" })}`,
        }))}
      />
    </div>
    </PlanOptionsProvider>
  );
}
