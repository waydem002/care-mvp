import Link from "next/link";
import { getPatients } from "@/lib/queries";
import PatientForm from "@/components/PatientForm";

export default async function PatientsPage() {
  const patients = await getPatients();

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold text-ink">Patients</h1>

      <div className="mb-8">
        <PatientForm />
      </div>

      <div className="overflow-hidden rounded-lg border border-border bg-surface">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-border bg-paper text-xs font-medium uppercase tracking-wide text-muted">
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Pflegegrad</th>
              <th className="px-4 py-3">Phone</th>
              <th className="px-4 py-3">Address</th>
            </tr>
          </thead>
          <tbody>
            {patients.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-10 text-center text-sm text-muted">
                  No patients yet — add the first one above.
                </td>
              </tr>
            )}
            {patients.map((p) => (
              <tr key={p.id} className="border-b border-border last:border-0 hover:bg-paper/60">
                <td className="px-4 py-3">
                  <Link href={`/patients/${p.id}`} className="font-medium text-brand hover:underline">
                    {p.full_name}
                  </Link>
                </td>
                <td className="px-4 py-3 text-ink">{p.pflegegrad ?? "—"}</td>
                <td className="px-4 py-3 text-ink">{p.phone ?? "—"}</td>
                <td className="px-4 py-3 text-ink">{p.address ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
