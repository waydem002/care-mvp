// Pure planning logic for "plan next week": decides each carer's weekend and
// weekday-off status for the new week from last week's plan and a few fixed rules.
// Visits are copied separately; the Tours page then lists whatever is left uncovered.

export type PlanStaff = {
  id: string;
  full_name: string;
  staff_type: "care" | "cleaning";
  planning_mode: "auto" | "manual";
  fixed_weekday_off: number | null; // 1 = Mon … 5 = Fri
  weekend_pattern: "alternate" | "sunday_only" | "saturday_only" | "off";
};

export type PlanStatus = {
  staff_member_id: string;
  status_date: string;
  status: "frei" | "fd" | "sd" | "abenddienst" | "buerodienst";
  companion_name: string | null;
};

export type PlanVisitRef = { staff_member_id: string; visit_date: string };

export function addDaysKey(startKey: string, days: number): string {
  const [y, m, d] = startKey.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

// 0 = Monday … 6 = Sunday
export function weekdayIndex(key: string): number {
  return (new Date(key + "T00:00:00Z").getUTCDay() + 6) % 7;
}

export type PlanResult = {
  statuses: PlanStatus[];
  saturday: string[];
  sunday: string[];
  newWeekdayOff: { name: string; weekday: number }[];
};

export function planWeekStatuses(
  weekStartKey: string,
  staff: PlanStaff[],
  prevStatuses: PlanStatus[],
  prevVisits: PlanVisitRef[]
): PlanResult {
  const prevStart = addDaysKey(weekStartKey, -7);
  const dateOf = (idx: number) => addDaysKey(weekStartKey, idx);
  const auto = staff.filter((s) => s.planning_mode === "auto");
  const care = auto.filter((s) => s.staff_type === "care");

  const prevOf = (id: string) => prevStatuses.filter((x) => x.staff_member_id === id);
  const visitsOn = (id: string, idx: number) =>
    prevVisits.filter((v) => v.staff_member_id === id && weekdayIndex(v.visit_date) === idx && v.visit_date >= prevStart).length;

  // FREI days are never created here: the boss sets them himself in the week grid.
  const newWeekdayOff: PlanResult["newWeekdayOff"] = [];

  // ---- weekend
  const statuses: PlanStatus[] = [];
  const saturday: string[] = [];
  const sunday: string[] = [];
  const put = (s: PlanStaff, idx: number, status: PlanStatus["status"]) =>
    statuses.push({ staff_member_id: s.id, status_date: dateOf(idx), status, companion_name: null });

  for (const s of care) {
    const prevSat = prevOf(s.id).find((x) => weekdayIndex(x.status_date) === 5);
    const prevSatWork = !!prevSat && prevSat.status !== "frei" ||
      prevVisits.some((v) => v.staff_member_id === s.id && weekdayIndex(v.visit_date) === 5);

    switch (s.weekend_pattern) {
      case "sunday_only":
        put(s, 6, "fd");
        sunday.push(s.full_name);
        break;
      case "saturday_only": {
        // Yamen alternates early and evening on Saturdays.
        const next = prevSat?.status === "fd" ? "abenddienst" : "fd";
        put(s, 5, next);
        saturday.push(s.full_name);
        break;
      }
      case "off":
        break;
      default:
        // alternate: works Saturday if she did not last week, otherwise Sunday.
        if (!prevSatWork) {
          put(s, 5, "fd");
          saturday.push(s.full_name);
        } else {
          put(s, 6, "fd");
          sunday.push(s.full_name);
        }
    }
  }

  // ---- carry over office duty on weekdays that are not her day off
  for (const s of care) {
    for (const x of prevOf(s.id)) {
      // Evening duty is chosen freely each week, so only office duty is carried over.
      if (x.status !== "buerodienst") continue;
      const idx = weekdayIndex(x.status_date);
      if (idx > 4) continue;
      statuses.push({ staff_member_id: s.id, status_date: dateOf(idx), status: x.status, companion_name: x.companion_name });
    }
  }

  return { statuses, saturday, sunday, newWeekdayOff };
}
