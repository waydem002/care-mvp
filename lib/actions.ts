"use server";

import { planWeekStatuses, type PlanStaff, type PlanStatus } from "@/lib/planner";
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

  const staffId = formData.get("staff_member_id") as string;
  const visitDate = formData.get("visit_date") as string;

  // Put the new stop at the end first (so it never collides with an existing
  // stop number), then let the database sort the whole day by time.
  const { data: last } = await supabase
    .from("visits")
    .select("sequence_order")
    .eq("staff_member_id", staffId)
    .eq("visit_date", visitDate)
    .order("sequence_order", { ascending: false })
    .limit(1);
  const nextOrder = (last?.[0]?.sequence_order ?? 0) + 1;

  const startTime = (formData.get("scheduled_time") as string) || null;
  const endTime = (formData.get("end_time") as string) || null;

  const { error } = await supabase.from("visits").insert({
    staff_member_id: staffId,
    patient_id: formData.get("patient_id") as string,
    visit_date: visitDate,
    sequence_order: nextOrder,
    scheduled_time: startTime,
    end_time: endTime,
    duration_minutes: startTime ? minutesBetween(startTime, endTime) : null,
    visit_type: formData.get("visit_type") as string,
    notes: (formData.get("notes") as string) || null,
    created_by: user?.id ?? null,
  });
  if (error) throw new Error(error.message);

  const { error: sortError } = await supabase.rpc("reorder_visits", { p_staff: staffId, p_date: visitDate });
  if (sortError) throw new Error(sortError.message);
  revalidatePath("/tours");
}

// Drag & drop: orderedIds is the new top-to-bottom order of one carer's day.
export async function reorderVisits(staffId: string, visitDate: string, orderedIds: string[]) {
  const supabase = createClient();
  const { error } = await supabase.rpc("reorder_visits", {
    p_staff: staffId,
    p_date: visitDate,
    p_ids: orderedIds,
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
      hourly_rate_eur: formData.get("hourly_rate_eur") ? Number(formData.get("hourly_rate_eur")) : null,
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


// ---------------------------------------------------------------------------
// One-click week generation from the recurring tour templates.
// weekStartKey must be a Monday (YYYY-MM-DD). Safe to run twice: visits and
// day-status rows that already exist for that week are skipped, not duplicated.
// ---------------------------------------------------------------------------
function addDaysKey(startKey: string, days: number): string {
  const [y, m, d] = startKey.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  return dt.toISOString().slice(0, 10);
}

function minutesBetween(start: string, end: string | null): number | null {
  if (!end) return null;
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  const diff = eh * 60 + em - (sh * 60 + sm);
  return diff > 0 ? diff : null;
}

// Copies the previous week's plan (visits + day statuses: FREI, FD, Abenddienst…)
// into the week starting at weekStartKey (a Monday). Nothing that already exists
// in the target week is overwritten or duplicated, so it is safe to click twice.
export async function copyPreviousWeek(weekStartKey: string): Promise<{ created: number; skipped: number; source: string }> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const prevStart = addDaysKey(weekStartKey, -7);
  const prevEnd = addDaysKey(weekStartKey, -1);
  const weekEnd = addDaysKey(weekStartKey, 6);

  const [prev, existing, prevStatus] = await Promise.all([
    supabase.from("visits").select("*").gte("visit_date", prevStart).lte("visit_date", prevEnd),
    supabase
      .from("visits")
      .select("staff_member_id, patient_id, visit_date, scheduled_time, sequence_order")
      .gte("visit_date", weekStartKey)
      .lte("visit_date", weekEnd),
    supabase.from("tour_day_status").select("*").gte("status_date", prevStart).lte("status_date", prevEnd),
  ]);
  if (prev.error) throw new Error(prev.error.message);
  if (existing.error) throw new Error(existing.error.message);
  if (prevStatus.error) throw new Error(prevStatus.error.message);

  const have = new Set(
    (existing.data ?? []).map((v) => `${v.staff_member_id}:${v.patient_id}:${v.visit_date}:${(v.scheduled_time ?? "").slice(0, 5)}`)
  );
  const usedSeq = new Set((existing.data ?? []).map((v) => `${v.staff_member_id}:${v.visit_date}:${v.sequence_order}`));

  const rows: Record<string, unknown>[] = [];
  let skipped = 0;
  for (const v of prev.data ?? []) {
    const date = addDaysKey(v.visit_date, 7);
    const key = `${v.staff_member_id}:${v.patient_id}:${date}:${(v.scheduled_time ?? "").slice(0, 5)}`;
    const seqKey = `${v.staff_member_id}:${date}:${v.sequence_order}`;
    if (have.has(key) || usedSeq.has(seqKey)) {
      skipped++;
      continue;
    }
    rows.push({
      staff_member_id: v.staff_member_id,
      patient_id: v.patient_id,
      visit_date: date,
      sequence_order: v.sequence_order,
      scheduled_time: v.scheduled_time,
      end_time: v.end_time,
      duration_minutes: v.duration_minutes,
      visit_type: v.visit_type,
      tags: v.tags ?? [],
      companion_name: v.companion_name,
      notes: v.notes,
      status: "planned",
      created_by: user?.id ?? null,
    });
  }
  if (rows.length > 0) {
    const { error } = await supabase.from("visits").insert(rows);
    if (error) throw new Error(error.message);
  }

  const statusRows = (prevStatus.data ?? []).map((d) => ({
    staff_member_id: d.staff_member_id,
    status_date: addDaysKey(d.status_date, 7),
    status: d.status,
    companion_name: d.companion_name,
  }));
  if (statusRows.length > 0) {
    const { error } = await supabase
      .from("tour_day_status")
      .upsert(statusRows, { onConflict: "staff_member_id,status_date,status", ignoreDuplicates: true });
    if (error) throw new Error(error.message);
  }

  revalidatePath("/tours");
  return { created: rows.length, skipped, source: prevStart };
}


// ---------------------------------------------------------------------------
// Absences (holiday, sick, extra FREI day) and cover for uncovered visits
// ---------------------------------------------------------------------------
export async function addAbsence(formData: FormData) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const start = formData.get("start_date") as string;
  const end = ((formData.get("end_date") as string) || start) as string;
  const { error } = await supabase.from("absences").insert({
    staff_member_id: formData.get("staff_member_id") as string,
    start_date: start,
    end_date: end < start ? start : end,
    absence_type: formData.get("absence_type") as string,
    note: (formData.get("note") as string) || null,
    created_by: user?.id ?? null,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/absences");
  revalidatePath("/tours");
}

export async function deleteAbsence(id: string) {
  const supabase = createClient();
  const { error } = await supabase.from("absences").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/absences");
  revalidatePath("/tours");
}

export async function deleteDayStatus(id: string) {
  const supabase = createClient();
  const { error } = await supabase.from("tour_day_status").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/tours");
}

// Moves one visit to another carer (cover). Both carers' days are re-sorted by time.
export async function assignVisitToStaff(visitId: string, newStaffId: string, permanent = false) {
  const supabase = createClient();
  const { data: visit, error: vErr } = await supabase
    .from("visits")
    .select("id, staff_member_id, visit_date, notes, staff_members(full_name)")
    .eq("id", visitId)
    .single();
  if (vErr || !visit) throw new Error(vErr?.message ?? "Visit not found");

  const oldStaffId = visit.staff_member_id as string;
  const date = visit.visit_date as string;
  const origName = (visit as any).staff_members?.full_name ?? "";

  const { data: last } = await supabase
    .from("visits")
    .select("sequence_order")
    .eq("staff_member_id", newStaffId)
    .eq("visit_date", date)
    .order("sequence_order", { ascending: false })
    .limit(1);
  const nextOrder = (last?.[0]?.sequence_order ?? 0) + 1;

  // Cover = temporary: noted as "Vertretung für X" and goes back to X next week.
  // Permanent move: no note, and any old cover note is removed, so it stays with the new carer.
  const cover = origName ? `Vertretung für ${origName}` : "Vertretung";
  const cleaned = ((visit.notes as string | null) ?? "").replace(/( · )?Vertretung für .*$/, "") || null;
  const newNotes = permanent ? cleaned : visit.notes ? `${visit.notes} · ${cover}` : cover;
  const { error } = await supabase
    .from("visits")
    .update({
      staff_member_id: newStaffId,
      sequence_order: nextOrder,
      notes: newNotes,
    })
    .eq("id", visitId);
  if (error) throw new Error(error.message);

  await supabase.rpc("reorder_visits", { p_staff: newStaffId, p_date: date });
  await supabase.rpc("reorder_visits", { p_staff: oldStaffId, p_date: date });
  revalidatePath("/tours");
}


// Evening support: the boss picks who works the evening with the Spätdienst lead (Yamen).
// Stored as an Abenddienst day status for both carers, each naming the other.
export async function setEveningSupport(dateKey: string, partnerId: string) {
  const supabase = createClient();
  const { data: lead } = await supabase
    .from("staff_members")
    .select("id, full_name")
    .eq("usual_shift", "spaet")
    .eq("staff_type", "care")
    .eq("active", true)
    .limit(1)
    .maybeSingle();
  if (!lead) throw new Error("No Spätdienst lead found");

  let partnerName: string | null = null;
  if (partnerId) {
    const { data: partner } = await supabase.from("staff_members").select("full_name").eq("id", partnerId).single();
    partnerName = partner?.full_name ?? null;
  }

  // Remove the previous partner's link for that evening, then write the new state.
  await supabase
    .from("tour_day_status")
    .delete()
    .eq("status_date", dateKey)
    .eq("status", "abenddienst")
    .eq("companion_name", lead.full_name)
    .neq("staff_member_id", lead.id);
  await supabase
    .from("tour_day_status")
    .delete()
    .eq("status_date", dateKey)
    .eq("status", "abenddienst")
    .eq("staff_member_id", lead.id);

  const rows: Record<string, unknown>[] = [
    { staff_member_id: lead.id, status_date: dateKey, status: "abenddienst", companion_name: partnerName },
  ];
  if (partnerId) {
    await supabase
      .from("tour_day_status")
      .delete()
      .eq("status_date", dateKey)
      .eq("status", "abenddienst")
      .eq("staff_member_id", partnerId);
    rows.push({ staff_member_id: partnerId, status_date: dateKey, status: "abenddienst", companion_name: lead.full_name });
  }
  const { error } = await supabase.from("tour_day_status").insert(rows);
  if (error) throw new Error(error.message);
  revalidatePath("/tours");
}


// ---------------------------------------------------------------------------
// "Plan this week": copies last week's visits for every carer who is planned
// automatically, then sets weekends (Saturday/Sunday alternation) and one weekday
// off per carer. Dorin (planning_mode = manual) is left for the boss to assign.
// Visits of carers who are off that day stay in the plan and show up as uncovered.
// ---------------------------------------------------------------------------
export async function planWeekAutomatically(weekStartKey: string): Promise<{
  created: number;
  saturday: string[];
  sunday: string[];
  newWeekdayOff: { name: string; weekday: number }[];
}> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const prevStart = addDaysKey(weekStartKey, -7);
  const prevEnd = addDaysKey(weekStartKey, -1);
  const weekEnd = addDaysKey(weekStartKey, 6);

  const [staffRes, prevVisits, prevStatus, existing] = await Promise.all([
    supabase.from("staff_members").select("id, full_name, staff_type, planning_mode, fixed_weekday_off, weekend_pattern").eq("active", true),
    supabase.from("visits").select("*").gte("visit_date", prevStart).lte("visit_date", prevEnd),
    supabase.from("tour_day_status").select("*").gte("status_date", prevStart).lte("status_date", prevEnd),
    supabase
      .from("visits")
      .select("staff_member_id, patient_id, visit_date, scheduled_time, sequence_order")
      .gte("visit_date", weekStartKey)
      .lte("visit_date", weekEnd),
  ]);
  for (const r of [staffRes, prevVisits, prevStatus, existing]) if (r.error) throw new Error(r.error.message);

  const staff = (staffRes.data ?? []) as PlanStaff[];
  const autoIds = new Set(staff.filter((x) => x.planning_mode === "auto").map((x) => x.id));

  // 1) copy visits of automatically planned staff.
  // A visit that was covered ("Vertretung für X") goes back to its usual carer X.
  const staffByName = new Map(staff.map((x) => [x.full_name, x.id]));
  const have = new Set(
    (existing.data ?? []).map((v) => `${v.staff_member_id}:${v.patient_id}:${v.visit_date}:${(v.scheduled_time ?? "").slice(0, 5)}`)
  );
  const usedSeq = new Set((existing.data ?? []).map((v) => `${v.staff_member_id}:${v.visit_date}:${v.sequence_order}`));
  const rows: Record<string, unknown>[] = [];
  const restored = new Set<string>();
  let restoredCounter = 0;
  for (const v of prevVisits.data ?? []) {
    let staffId: string = v.staff_member_id;
    let notes: string | null = v.notes;
    let sequence: number = v.sequence_order;
    const m = typeof v.notes === "string" ? v.notes.match(/(?:^| · )?Vertretung für (.+)$/) : null;
    if (m && staffByName.has(m[1])) {
      staffId = staffByName.get(m[1])!;
      notes = (v.notes as string).replace(/( · )?Vertretung für .*$/, "") || null;
      sequence = 100000 + restoredCounter++; // re-sorted by time below
    }
    if (!autoIds.has(staffId)) continue;
    const date = addDaysKey(v.visit_date, 7);
    if (have.has(`${staffId}:${v.patient_id}:${date}:${(v.scheduled_time ?? "").slice(0, 5)}`)) continue;
    if (usedSeq.has(`${staffId}:${date}:${sequence}`)) continue;
    if (sequence >= 100000) restored.add(`${staffId}|${date}`);
    rows.push({
      staff_member_id: staffId,
      patient_id: v.patient_id,
      visit_date: date,
      sequence_order: sequence,
      scheduled_time: v.scheduled_time,
      end_time: v.end_time,
      duration_minutes: v.duration_minutes,
      visit_type: v.visit_type,
      tags: v.tags ?? [],
      companion_name: v.companion_name,
      notes,
      status: "planned",
      created_by: user?.id ?? null,
    });
  }
  if (rows.length > 0) {
    const { error } = await supabase.from("visits").insert(rows);
    if (error) throw new Error(error.message);
  }
  for (const key of Array.from(restored)) {
    const [sid, d] = key.split("|");
    await supabase.rpc("reorder_visits", { p_staff: sid, p_date: d });
  }

  // 2) weekends, weekday off, evening/office duty
  const plan = planWeekStatuses(
    weekStartKey,
    staff,
    (prevStatus.data ?? []) as PlanStatus[],
    (prevVisits.data ?? []).map((v) => ({ staff_member_id: v.staff_member_id, visit_date: v.visit_date }))
  );
  if (plan.statuses.length > 0) {
    const { error } = await supabase
      .from("tour_day_status")
      .upsert(plan.statuses, { onConflict: "staff_member_id,status_date,status", ignoreDuplicates: true });
    if (error) throw new Error(error.message);
  }

  revalidatePath("/tours");
  return { created: rows.length, saturday: plan.saturday, sunday: plan.sunday, newWeekdayOff: plan.newWeekdayOff };
}


// Swap the client on a visit (e.g. a wrong or changed client).
export async function changeVisitPatient(visitId: string, patientId: string) {
  const supabase = createClient();
  const { error } = await supabase.from("visits").update({ patient_id: patientId }).eq("id", visitId);
  if (error) throw new Error(error.message);
  revalidatePath("/tours");
}


// Drag a visit onto another day of the same week: same carer, same times.
// The carer's old and new day are re-sorted by time.
export async function moveVisitToDate(visitId: string, newDateKey: string) {
  const supabase = createClient();
  const { data: visit, error: vErr } = await supabase
    .from("visits")
    .select("id, staff_member_id, visit_date")
    .eq("id", visitId)
    .single();
  if (vErr || !visit) throw new Error(vErr?.message ?? "Visit not found");
  if (visit.visit_date === newDateKey) return;

  const staffId = visit.staff_member_id as string;
  const { data: last } = await supabase
    .from("visits")
    .select("sequence_order")
    .eq("staff_member_id", staffId)
    .eq("visit_date", newDateKey)
    .order("sequence_order", { ascending: false })
    .limit(1);
  const nextOrder = (last?.[0]?.sequence_order ?? 0) + 1;

  const { error } = await supabase
    .from("visits")
    .update({ visit_date: newDateKey, sequence_order: nextOrder })
    .eq("id", visitId);
  if (error) throw new Error(error.message);

  await supabase.rpc("reorder_visits", { p_staff: staffId, p_date: newDateKey });
  await supabase.rpc("reorder_visits", { p_staff: staffId, p_date: visit.visit_date });
  revalidatePath("/tours");
}


// Evening duty (Abenddienst) is a free choice: any carer can be put on or taken off any day.
export async function toggleEveningDuty(staffId: string, dateKey: string, on: boolean) {
  const supabase = createClient();
  if (on) {
    const { error } = await supabase
      .from("tour_day_status")
      .upsert(
        [{ staff_member_id: staffId, status_date: dateKey, status: "abenddienst", companion_name: null }],
        { onConflict: "staff_member_id,status_date,status", ignoreDuplicates: true }
      );
    if (error) throw new Error(error.message);
  } else {
    const { error } = await supabase
      .from("tour_day_status")
      .delete()
      .eq("staff_member_id", staffId)
      .eq("status_date", dateKey)
      .eq("status", "abenddienst");
    if (error) throw new Error(error.message);
  }
  revalidatePath("/tours");
}


// Week grid: switch one status on or off for a carer on a day.
// Any carer may get any shift on any day (FD / SD / Abenddienst / Bürodienst). FREI excludes the work shifts.
export async function setDayStatus(
  staffId: string,
  dateKey: string,
  status: "frei" | "fd" | "sd" | "abenddienst" | "buerodienst",
  on: boolean
) {
  const supabase = createClient();
  if (!on) {
    const { error } = await supabase
      .from("tour_day_status")
      .delete()
      .eq("staff_member_id", staffId)
      .eq("status_date", dateKey)
      .eq("status", status);
    if (error) throw new Error(error.message);
  } else {
    const clear = status === "frei" ? ["fd", "sd", "abenddienst"] : ["frei"];
    if (status !== "buerodienst") {
      const { error: delErr } = await supabase
        .from("tour_day_status")
        .delete()
        .eq("staff_member_id", staffId)
        .eq("status_date", dateKey)
        .in("status", clear);
      if (delErr) throw new Error(delErr.message);
    }
    const { error } = await supabase
      .from("tour_day_status")
      .upsert([{ staff_member_id: staffId, status_date: dateKey, status, companion_name: null }], {
        onConflict: "staff_member_id,status_date,status",
        ignoreDuplicates: true,
      });
    if (error) throw new Error(error.message);
  }
  revalidatePath("/tours");
  revalidatePath("/tours/grid");
}


// Add several visits to one carer's day in one go. The day is then sorted by time.
export async function addVisitsBatch(
  staffId: string,
  visitDate: string,
  rows: { patientId: string; start: string; end: string; tags: string[] }[]
) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (rows.length === 0) return;

  const { data: last } = await supabase
    .from("visits")
    .select("sequence_order")
    .eq("staff_member_id", staffId)
    .eq("visit_date", visitDate)
    .order("sequence_order", { ascending: false })
    .limit(1);
  let seq = last?.[0]?.sequence_order ?? 0;

  const insertRows = rows.map((r) => {
    seq += 1;
    return {
      staff_member_id: staffId,
      patient_id: r.patientId,
      visit_date: visitDate,
      sequence_order: seq,
      scheduled_time: r.start || null,
      end_time: r.end || null,
      duration_minutes: r.start ? minutesBetween(r.start, r.end || null) : null,
      visit_type: "care",
      tags: r.tags ?? [],
      created_by: user?.id ?? null,
    };
  });
  const { error } = await supabase.from("visits").insert(insertRows);
  if (error) throw new Error(error.message);

  const { error: sortError } = await supabase.rpc("reorder_visits", { p_staff: staffId, p_date: visitDate });
  if (sortError) throw new Error(sortError.message);
  revalidatePath("/tours");
}


// Change the time of one visit and put the day back in time order.
export async function updateVisitTime(visitId: string, start: string, end: string) {
  const supabase = createClient();
  const { data: visit, error: vErr } = await supabase
    .from("visits")
    .select("staff_member_id, visit_date")
    .eq("id", visitId)
    .single();
  if (vErr || !visit) throw new Error(vErr?.message ?? "Visit not found");
  const { error } = await supabase
    .from("visits")
    .update({
      scheduled_time: start || null,
      end_time: end || null,
      duration_minutes: start ? minutesBetween(start, end || null) : null,
    })
    .eq("id", visitId);
  if (error) throw new Error(error.message);
  await supabase.rpc("reorder_visits", { p_staff: visit.staff_member_id, p_date: visit.visit_date });
  revalidatePath("/tours");
}


// Client weekly list: how many visits a client is due on a weekday (0 removes the entry).
export async function setScheduleCell(patientId: string, weekday: number, kind: "care" | "cleaning", count: number) {
  const supabase = createClient();
  if (count <= 0) {
    const { error } = await supabase.from("client_schedule").delete().eq("patient_id", patientId).eq("weekday", weekday).eq("kind", kind);
    if (error) throw new Error(error.message);
  } else {
    const { error } = await supabase
      .from("client_schedule")
      .upsert([{ patient_id: patientId, weekday, kind, visits_per_day: count }], { onConflict: "patient_id,weekday,kind" });
    if (error) throw new Error(error.message);
  }
  revalidatePath("/tours/clients");
  revalidatePath("/tours");
}

// "Not this week" (hospital, holiday, skipped week): the client is not flagged as unassigned that week.
export async function skipClientWeek(patientId: string, weekStartKey: string, on: boolean) {
  const supabase = createClient();
  if (on) {
    const { error } = await supabase
      .from("schedule_skips")
      .upsert([{ patient_id: patientId, week_start: weekStartKey }], { onConflict: "patient_id,week_start", ignoreDuplicates: true });
    if (error) throw new Error(error.message);
  } else {
    const { error } = await supabase.from("schedule_skips").delete().eq("patient_id", patientId).eq("week_start", weekStartKey);
    if (error) throw new Error(error.message);
  }
  revalidatePath("/tours");
}
