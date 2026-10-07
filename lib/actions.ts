"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function generateTodayReminders() {
  const supabase = createClient();
  const { error } = await supabase.rpc("generate_daily_reminders");
  if (error) throw new Error(error.message);
  revalidatePath("/dashboard");
  revalidatePath("/reminders");
}

export async function markReminderSent(reminderId: string) {
  const supabase = createClient();
  const { error } = await supabase
    .from("reminders")
    .update({ status: "sent", sent_at: new Date().toISOString() })
    .eq("id", reminderId);
  if (error) throw new Error(error.message);
  revalidatePath("/dashboard");
  revalidatePath("/reminders");
}

export async function confirmReminder(reminderId: string) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await supabase
    .from("reminders")
    .update({
      status: "confirmed",
      confirmed_at: new Date().toISOString(),
      confirmed_by: user?.id ?? null,
    })
    .eq("id", reminderId);
  if (error) throw new Error(error.message);
  revalidatePath("/dashboard");
  revalidatePath("/reminders");
}

export async function markReminderMissed(reminderId: string) {
  const supabase = createClient();
  const { error } = await supabase
    .from("reminders")
    .update({ status: "missed" })
    .eq("id", reminderId);
  if (error) throw new Error(error.message);
  revalidatePath("/dashboard");
  revalidatePath("/reminders");
}

export async function addPatient(formData: FormData) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (formData.get("consent_data_processing") !== "on") {
    throw new Error("Data processing consent is required to add a patient.");
  }

  const { data: patient, error } = await supabase
    .from("patients")
    .insert({
      full_name: formData.get("full_name") as string,
      date_of_birth: (formData.get("date_of_birth") as string) || null,
      pflegegrad: formData.get("pflegegrad") ? Number(formData.get("pflegegrad")) : null,
      address: (formData.get("address") as string) || null,
      phone: (formData.get("phone") as string) || null,
      notes: (formData.get("notes") as string) || null,
      created_by: user?.id ?? null,
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);

  // Consent is captured at the same time as the patient record, per DSGVO —
  // data_processing is required to proceed; WhatsApp is a separate, optional
  // consent since it's a distinct processing purpose (see README).
  const consentRows: { patient_id: string; consent_type: string; granted_by: string | null }[] = [
    { patient_id: patient.id, consent_type: "data_processing", granted_by: user?.id ?? null },
  ];
  if (formData.get("consent_whatsapp") === "on") {
    consentRows.push({ patient_id: patient.id, consent_type: "whatsapp_communication", granted_by: user?.id ?? null });
  }
  const { error: consentError } = await supabase.from("consents").insert(consentRows);
  if (consentError) throw new Error(consentError.message);

  revalidatePath("/patients");
}

export async function exportPatientData(patientId: string) {
  const supabase = createClient();

  const [patient, medications, reminders, consents, auditLog] = await Promise.all([
    supabase.from("patients").select("*").eq("id", patientId).single(),
    supabase.from("medications").select("*").eq("patient_id", patientId),
    supabase.from("reminders").select("*").eq("patient_id", patientId),
    supabase.from("consents").select("*").eq("patient_id", patientId),
    supabase.from("audit_log").select("*").eq("record_id", patientId).order("created_at", { ascending: false }),
  ]);

  if (patient.error) throw new Error(patient.error.message);

  return {
    exported_at: new Date().toISOString(),
    patient: patient.data,
    medications: medications.data ?? [],
    reminders: reminders.data ?? [],
    consents: consents.data ?? [],
    audit_log: auditLog.data ?? [],
  };
}

export async function requestPatientDeletion(patientId: string, reason: string) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await supabase.from("deletion_requests").insert({
    patient_id: patientId,
    requested_by: user?.id ?? null,
    reason: reason || null,
  });
  if (error) throw new Error(error.message);
  revalidatePath(`/patients/${patientId}`);
}

export async function completeDeletionRequest(requestId: string, patientId: string) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Deleting the patient cascades to medications/reminders/notifications/consents.
  // audit_log keeps a snapshot of the deleted row (record_id no longer resolves,
  // but the jsonb `changes` column preserves what was deleted, for compliance proof).
  const { error: deleteError } = await supabase.from("patients").delete().eq("id", patientId);
  if (deleteError) throw new Error(deleteError.message);

  const { error: requestError } = await supabase
    .from("deletion_requests")
    .update({ status: "completed", completed_at: new Date().toISOString(), completed_by: user?.id ?? null })
    .eq("id", requestId);
  if (requestError) throw new Error(requestError.message);

  revalidatePath("/patients");
}

export async function rejectDeletionRequest(requestId: string, patientId: string) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await supabase
    .from("deletion_requests")
    .update({ status: "rejected", completed_at: new Date().toISOString(), completed_by: user?.id ?? null })
    .eq("id", requestId);
  if (error) throw new Error(error.message);
  revalidatePath(`/patients/${patientId}`);
}

export async function addStaffMember(formData: FormData) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await supabase.from("staff_members").insert({
    full_name: formData.get("full_name") as string,
    role: formData.get("role") as string,
    phone: (formData.get("phone") as string) || null,
    email: (formData.get("email") as string) || null,
    created_by: user?.id ?? null,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/staff");
}

export async function addShift(formData: FormData) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await supabase.from("shifts").insert({
    staff_member_id: formData.get("staff_member_id") as string,
    shift_date: formData.get("shift_date") as string,
    shift_type: formData.get("shift_type") as string,
    start_time: formData.get("start_time") as string,
    end_time: formData.get("end_time") as string,
    notes: (formData.get("notes") as string) || null,
    created_by: user?.id ?? null,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/schedule");
}

export async function deleteShift(shiftId: string) {
  const supabase = createClient();
  const { error } = await supabase.from("shifts").delete().eq("id", shiftId);
  if (error) throw new Error(error.message);
  revalidatePath("/schedule");
}

export async function addVisit(formData: FormData) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await supabase.from("visits").insert({
    staff_member_id: formData.get("staff_member_id") as string,
    patient_id: formData.get("patient_id") as string,
    visit_date: formData.get("visit_date") as string,
    sequence_order: Number(formData.get("sequence_order")),
    scheduled_time: (formData.get("scheduled_time") as string) || null,
    visit_type: formData.get("visit_type") as string,
    notes: (formData.get("notes") as string) || null,
    created_by: user?.id ?? null,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/tours");
}

export async function updateVisitStatus(visitId: string, status: "planned" | "completed" | "cancelled") {
  const supabase = createClient();
  const { error } = await supabase.from("visits").update({ status }).eq("id", visitId);
  if (error) throw new Error(error.message);
  revalidatePath("/tours");
}

export async function deleteVisit(visitId: string) {
  const supabase = createClient();
  const { error } = await supabase.from("visits").delete().eq("id", visitId);
  if (error) throw new Error(error.message);
  revalidatePath("/tours");
}

// Public — no login required. Relies on the "anyone can submit a booking
// request" RLS policy (insert-only for the `anon` role). Never call
// supabase.auth.getUser() as a requirement here; this must work with
// zero session.
export async function submitBookingRequest(formData: FormData) {
  const supabase = createClient();

  const { error } = await supabase.from("booking_requests").insert({
    requester_name: formData.get("requester_name") as string,
    requester_phone: (formData.get("requester_phone") as string) || null,
    requester_email: (formData.get("requester_email") as string) || null,
    patient_name: (formData.get("patient_name") as string) || null,
    request_type: formData.get("request_type") as string,
    preferred_date: (formData.get("preferred_date") as string) || null,
    preferred_time: (formData.get("preferred_time") as string) || null,
    message: (formData.get("message") as string) || null,
  });
  if (error) throw new Error(error.message);
}

export async function updateBookingRequestStatus(
  requestId: string,
  status: "pending" | "approved" | "rejected" | "completed"
) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await supabase
    .from("booking_requests")
    .update({ status, reviewed_by: user?.id ?? null, reviewed_at: new Date().toISOString() })
    .eq("id", requestId);
  if (error) throw new Error(error.message);
  revalidatePath("/requests");
}

export async function updateBookingRequestNotes(requestId: string, notes: string) {
  const supabase = createClient();
  const { error } = await supabase.from("booking_requests").update({ admin_notes: notes }).eq("id", requestId);
  if (error) throw new Error(error.message);
  revalidatePath("/requests");
}

export async function updateInsuranceRate(formData: FormData) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pflegegrad = Number(formData.get("pflegegrad"));

  const { error } = await supabase
    .from("insurance_rates")
    .update({
      pflegesachleistung_monthly: Number(formData.get("pflegesachleistung_monthly")),
      pflegegeld_monthly: Number(formData.get("pflegegeld_monthly")),
      entlastungsbetrag_monthly: Number(formData.get("entlastungsbetrag_monthly")),
      effective_from: formData.get("effective_from") as string,
      notes: (formData.get("notes") as string) || null,
      updated_by: user?.id ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq("pflegegrad", pflegegrad);
  if (error) throw new Error(error.message);
  revalidatePath("/insurance-calculator");
}

export async function addMedication(patientId: string, formData: FormData) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const timesRaw = formData.get("times") as string; // comma separated "08:00,14:00,20:00"
  const times = timesRaw
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);

  const { error } = await supabase.from("medications").insert({
    patient_id: patientId,
    name: formData.get("name") as string,
    dosage: (formData.get("dosage") as string) || null,
    times,
    created_by: user?.id ?? null,
  });
  if (error) throw new Error(error.message);
  revalidatePath(`/patients/${patientId}`);
}
