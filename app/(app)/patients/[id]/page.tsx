import { notFound } from "next/navigation";
import { getPatient, getMedicationsForPatient, getConsentsForPatient, getDeletionRequestsForPatient, getAuditLogForPatient } from "@/lib/queries";
import MedicationForm from "@/components/MedicationForm";
import DsgvoPanel from "@/components/DsgvoPanel";

export default async function PatientDetailPage({ params }: { params: { id: string } }) {
  const patient = await getPatient(params.id);
  if (!patient) notFound();

  const [medications, consents, deletionRequests, auditLog] = await Promise.all([
    getMedicationsForPatient(params.id),
    getConsentsForPatient(params.id),
    getDeletionRequestsForPatient(params.id),
    getAuditLogForPatient(params.id),
  ]);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-ink">{patient.full_name}</h1>
        <div className="mt-1 flex gap-4 text-sm text-muted">
          {patient.pflegegrad && <span>Pflegegrad {patient.pflegegrad}</span>}
          {patient.phone && <span>{patient.phone}</span>}
          {patient.address && <span>{patient.address}</span>}
        </div>
      </div>

      <div className="mb-8 grid grid-cols-2 gap-6">
        <div className="overflow-hidden rounded-lg border border-border bg-surface">
          <div className="border-b border-border bg-paper px-4 py-3">
            <h2 className="text-sm font-semibold text-ink">Medications</h2>
          </div>
          <table className="w-full text-left text-sm">
            <tbody>
              {medications.length === 0 && (
                <tr>
                  <td className="px-4 py-6 text-center text-sm text-muted">No medications yet.</td>
                </tr>
              )}
              {medications.map((m) => (
                <tr key={m.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3">
                    <p className="font-medium text-ink">
                      {m.name} {m.dosage && <span className="font-normal text-muted">· {m.dosage}</span>}
                    </p>
                    <p className="mt-0.5 tabular-nums text-xs text-muted">{m.times.join(" · ")}</p>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <MedicationForm patientId={patient.id} />
      </div>

      {patient.notes && (
        <div className="mb-8 rounded-lg border border-border bg-surface p-5">
          <h2 className="mb-2 text-sm font-semibold text-ink">Notes</h2>
          <p className="text-sm text-ink">{patient.notes}</p>
        </div>
      )}

      <DsgvoPanel
        patientId={patient.id}
        patientName={patient.full_name}
        consents={consents}
        deletionRequests={deletionRequests}
        auditLog={auditLog}
      />
    </div>
  );
}
