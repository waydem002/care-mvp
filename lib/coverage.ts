import type { Absence, StaffMember, TourDayStatus, Visit } from "@/lib/types";

export type Gap = {
  visit: Visit;
  reason: string; // why the original carer is not available
  isCleaning: boolean;
  suggestions: StaffMember[];
  loads: Record<string, number>; // visits each suggested carer already has that day
  knows: Record<string, boolean>; // suggested carer already visits this client in this plan
};

const reasonLabels: Record<string, string> = {
  urlaub: "Urlaub",
  krank: "krank",
  frei: "FREI",
  sonstiges: "abwesend",
};

function toMinutes(t: string | null): number | null {
  if (!t) return null;
  const [h, m] = t.slice(0, 5).split(":").map(Number);
  return h * 60 + m;
}

function window(v: Visit): [number, number] | null {
  const s = toMinutes(v.scheduled_time);
  if (s === null) return null;
  const e = toMinutes(v.end_time);
  return [s, e !== null && e > s ? e : s + 15];
}

// Finds every visit whose carer is absent (holiday/sick/FREI) on that day,
// and for care visits suggests carers who are marked "can cover", are
// working that day and have no overlapping visit.
export function findGaps(
  visits: Visit[],
  staff: StaffMember[],
  absences: Absence[],
  dayStatus: TourDayStatus[]
): Gap[] {
  const staffById = new Map(staff.map((s) => [s.id, s]));

  const absentReason = (staffId: string, date: string): string | null => {
    const a = absences.find((x) => x.staff_member_id === staffId && x.start_date <= date && x.end_date >= date);
    if (a) return reasonLabels[a.absence_type] ?? "abwesend";
    const st = dayStatus.find((x) => x.staff_member_id === staffId && x.status_date === date && x.status === "frei");
    return st ? "FREI" : null;
  };

  const gaps: Gap[] = [];
  for (const v of visits) {
    const reason = absentReason(v.staff_member_id, v.visit_date);
    if (!reason) continue;

    const owner = staffById.get(v.staff_member_id);
    const isCleaning = owner?.staff_type === "cleaning";
    let suggestions: StaffMember[] = [];

    if (!isCleaning) {
      const w = window(v);
      suggestions = staff
        .filter((s) => s.active && s.staff_type === "care" && s.can_cover && s.id !== v.staff_member_id)
        .filter((s) => !absentReason(s.id, v.visit_date))
        .filter((s) => {
          if (!w) return true;
          return !visits.some((o) => {
            if (o.id === v.id || o.staff_member_id !== s.id || o.visit_date !== v.visit_date) return false;
            const ow = window(o);
            return ow ? ow[0] < w[1] && w[0] < ow[1] : false;
          });
        });
    }
    const loads: Record<string, number> = {};
    const knows: Record<string, boolean> = {};
    for (const s of suggestions) {
      knows[s.id] = visits.some((o) => o.patient_id === v.patient_id && o.staff_member_id === s.id);
      loads[s.id] = visits.filter((o) => o.staff_member_id === s.id && o.visit_date === v.visit_date).length;
    }
    // Carers who already know the client come first, then the lightest day. The boss decides.
    suggestions.sort(
      (a, b) =>
        Number(knows[b.id]) - Number(knows[a.id]) ||
        loads[a.id] - loads[b.id] ||
        a.full_name.localeCompare(b.full_name, "de")
    );
    gaps.push({ visit: v, reason, isCleaning, suggestions, loads, knows });
  }

  return gaps.sort(
    (a, b) =>
      a.visit.visit_date.localeCompare(b.visit.visit_date) ||
      (a.visit.scheduled_time ?? "99").localeCompare(b.visit.scheduled_time ?? "99")
  );
}


// Rest-day rule: every care carer needs at least one weekday (Mon–Fri) off in the week.
// A FREI day status or an absence (holiday, sick, FREI) on a weekday counts.
export function carersWithoutWeekdayOff(
  staff: StaffMember[],
  absences: Absence[],
  dayStatus: TourDayStatus[],
  weekdayKeys: string[] // the five Mon–Fri date keys of the week
): StaffMember[] {
  return staff.filter((s) => {
    if (!s.active || s.staff_type !== "care") return false;
    const hasOff = weekdayKeys.some(
      (k) =>
        dayStatus.some((d) => d.staff_member_id === s.id && d.status_date === k && d.status === "frei") ||
        absences.some((a) => a.staff_member_id === s.id && a.start_date <= k && a.end_date >= k)
    );
    return !hasOff;
  });
}
