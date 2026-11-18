import type { ClientScheduleRow, Visit } from "@/lib/types";

export type DueItem = {
  patientId: string;
  name: string;
  kind: "care" | "cleaning";
  required: number;
  assigned: number;
  skipped: boolean; // not this week, or in hospital that day
};

// 1 = Monday … 7 = Sunday
export function isoWeekday(key: string): number {
  return ((new Date(key + "T00:00:00Z").getUTCDay() + 6) % 7) + 1;
}

// For every day of the week: which clients are due, how many visits they need and how many are planned.
export function computeDue(
  dateKeys: string[],
  schedule: ClientScheduleRow[],
  visits: Visit[],
  skippedPatientIds: string[],
  patientNames: Map<string, string>
): Record<string, DueItem[]> {
  const skipped = new Set(skippedPatientIds);
  const out: Record<string, DueItem[]> = {};

  for (const key of dateKeys) {
    const wd = isoWeekday(key);
    const dayVisits = visits.filter((v) => v.visit_date === key);
    out[key] = schedule
      .filter((r) => r.weekday === wd)
      .map((r) => {
        const mine = dayVisits.filter((v) => v.patient_id === r.patient_id);
        const hospital = mine.some((v) => v.tags?.includes("kkh"));
        const assigned = mine.filter((v) => {
          const cleaning = !!v.tags?.includes("reinigung");
          return (r.kind === "cleaning") === cleaning && !v.tags?.includes("kkh") && !v.tags?.includes("abend");
        }).length;
        return {
          patientId: r.patient_id,
          name: patientNames.get(r.patient_id) ?? "—",
          kind: r.kind,
          required: r.visits_per_day,
          assigned,
          skipped: skipped.has(r.patient_id) || hospital,
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name, "de"));
  }
  return out;
}
