// Builds a Monday-start month grid (German convention), including the
// trailing/leading days from adjacent months needed to fill complete weeks.
export function getMonthGrid(year: number, month: number): Date[][] {
  const firstOfMonth = new Date(year, month - 1, 1);
  const lastOfMonth = new Date(year, month, 0);

  // JS getDay(): Sunday = 0 ... Saturday = 6. Convert to Monday = 0 ... Sunday = 6.
  const firstWeekday = (firstOfMonth.getDay() + 6) % 7;

  const days: Date[] = [];
  for (let i = firstWeekday; i > 0; i--) {
    days.push(new Date(year, month - 1, 1 - i));
  }
  for (let d = 1; d <= lastOfMonth.getDate(); d++) {
    days.push(new Date(year, month - 1, d));
  }
  while (days.length % 7 !== 0) {
    const last = days[days.length - 1];
    days.push(new Date(last.getFullYear(), last.getMonth(), last.getDate() + 1));
  }

  const weeks: Date[][] = [];
  for (let i = 0; i < days.length; i += 7) {
    weeks.push(days.slice(i, i + 7));
  }
  return weeks;
}

export function toDateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// Monday-start week, matching the month grid's convention.
export function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - day);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function getWeekDates(weekStart: Date): Date[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    return d;
  });
}
