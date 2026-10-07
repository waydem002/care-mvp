import { getStaffMembers } from "@/lib/queries";
import StaffForm from "@/components/StaffForm";

const roleLabels: Record<string, string> = {
  nurse: "Nurse",
  caregiver: "Caregiver",
  driver: "Driver",
  admin: "Admin",
  other: "Other",
};

export default async function StaffPage() {
  const staff = await getStaffMembers();

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold text-ink">Staff</h1>

      <div className="mb-8">
        <StaffForm />
      </div>

      <div className="overflow-hidden rounded-lg border border-border bg-surface">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-border bg-paper text-xs font-medium uppercase tracking-wide text-muted">
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">Phone</th>
              <th className="px-4 py-3">Email</th>
            </tr>
          </thead>
          <tbody>
            {staff.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-10 text-center text-sm text-muted">
                  No staff members yet — add the first one above.
                </td>
              </tr>
            )}
            {staff.map((s) => (
              <tr key={s.id} className="border-b border-border last:border-0">
                <td className="px-4 py-3 font-medium text-ink">{s.full_name}</td>
                <td className="px-4 py-3 text-ink">{roleLabels[s.role] ?? s.role}</td>
                <td className="px-4 py-3 text-ink">{s.phone ?? "—"}</td>
                <td className="px-4 py-3 text-ink">{s.email ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
