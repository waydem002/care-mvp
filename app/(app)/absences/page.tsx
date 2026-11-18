import { getAbsences, getStaffMembers } from "@/lib/queries";
import { deleteAbsence } from "@/lib/actions";
import AbsenceForm from "@/components/AbsenceForm";
import { toDateKey } from "@/lib/calendar";

const typeLabels: Record<string, string> = {
  urlaub: "Urlaub",
  krank: "Krank",
  frei: "FREI",
  sonstiges: "Other",
};

function fmt(d: string) {
  return new Date(d).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export default async function AbsencesPage() {
  const [staff, absences] = await Promise.all([getStaffMembers(), getAbsences(toDateKey(new Date()))]);

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold text-ink">Absences</h1>
      <div className="mb-8">
        <AbsenceForm staff={staff.filter((s) => s.active)} />
      </div>

      <div className="overflow-hidden rounded-lg border border-border bg-surface">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-border bg-paper text-xs font-medium uppercase tracking-wide text-muted">
              <th className="px-4 py-3">Staff</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">From</th>
              <th className="px-4 py-3">To</th>
              <th className="px-4 py-3">Note</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {absences.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-sm text-muted">No upcoming absences.</td>
              </tr>
            )}
            {absences.map((a) => (
              <tr key={a.id} className="border-b border-border last:border-0">
                <td className="px-4 py-3 font-medium text-ink">{a.staff_name}</td>
                <td className="px-4 py-3 text-ink">{typeLabels[a.absence_type] ?? a.absence_type}</td>
                <td className="px-4 py-3 text-ink">{fmt(a.start_date)}</td>
                <td className="px-4 py-3 text-ink">{fmt(a.end_date)}</td>
                <td className="px-4 py-3 text-ink">{a.note ?? "—"}</td>
                <td className="px-4 py-3 text-right">
                  <form action={deleteAbsence.bind(null, a.id)}>
                    <button className="text-xs text-muted hover:text-ink" type="submit">Delete</button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
