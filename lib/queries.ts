import { createClient } from "@/lib/supabase/server";
import type { Reminder, Patient, Medication, Consent, DeletionRequest, AuditLogEntry, StaffMember, Shift, Visit, BookingRequest, InsuranceRate, Document } from "@/lib/types";

function startAndEndOfDay(date = new Date()) {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const end = new Date(date);
  end.setHours(23, 59, 59, 999);
  return { start: start.toISOString(), end: end.toISOString() };
}

type ReminderRow = {
  id: string;
  medication_id: string;
  patient_id: string;
  scheduled_for: string;
  status: Reminder["status"];
  sent_at: string | null;
  confirmed_at: string | null;
  created_at: string;
  patients: { full_name: string } | null;
  medications: { name: string; dosage: string | null } | null;
};

function mapReminder(row: ReminderRow): Reminder {
  return {
    id: row.id,
    medication_id: row.medication_id,
    patient_id: row.patient_id,
    scheduled_for: row.scheduled_for,
    status: row.status,
    sent_at: row.sent_at,
    confirmed_at: row.confirmed_at,
    created_at: row.created_at,
    patient_name: row.patients?.full_name ?? "Unknown patient",
    medication_name: row.medications?.name ?? "Unknown medication",
    dosage: row.medications?.dosage ?? null,
  };
}

export async function getTodayReminders(): Promise<Reminder[]> {
  const supabase = createClient();
  const { start, end } = startAndEndOfDay();

  const { data, error } = await supabase
    .from("reminders")
    .select("*, patients(full_name), medications(name, dosage)")
    .gte("scheduled_for", start)
    .lte("scheduled_for", end)
    .order("scheduled_for", { ascending: true });

  if (error) throw new Error(error.message);
  return (data as unknown as ReminderRow[]).map(mapReminder);
}

export async function getUpcomingReminders(days = 7): Promise<Reminder[]> {
  const supabase = createClient();
  const { start } = startAndEndOfDay();
  const end = new Date();
  end.setDate(end.getDate() + days);

  const { data, error } = await supabase
    .from("reminders")
    .select("*, patients(full_name), medications(name, dosage)")
    .gte("scheduled_for", start)
    .lte("scheduled_for", end.toISOString())
    .order("scheduled_for", { ascending: true });

  if (error) throw new Error(error.message);
  return (data as unknown as ReminderRow[]).map(mapReminder);
}

export async function getPatients(): Promise<Patient[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("patients")
    .select("*")
    .order("full_name", { ascending: true });

  if (error) throw new Error(error.message);
  return data as Patient[];
}

export async function getPatient(id: string): Promise<Patient | null> {
  const supabase = createClient();
  const { data, error } = await supabase.from("patients").select("*").eq("id", id).single();
  if (error) return null;
  return data as Patient;
}

export async function getMedicationsForPatient(patientId: string): Promise<Medication[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("medications")
    .select("*")
    .eq("patient_id", patientId)
    .order("created_at", { ascending: true });

  if (error) throw new Error(error.message);
  return data as Medication[];
}

export async function getConsentsForPatient(patientId: string): Promise<Consent[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("consents")
    .select("*")
    .eq("patient_id", patientId);

  if (error) throw new Error(error.message);
  return data as Consent[];
}

export async function getDeletionRequestsForPatient(patientId: string): Promise<DeletionRequest[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("deletion_requests")
    .select("*")
    .eq("patient_id", patientId)
    .order("requested_at", { ascending: false });

  if (error) throw new Error(error.message);
  return data as DeletionRequest[];
}

export async function getAuditLogForPatient(patientId: string): Promise<AuditLogEntry[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("audit_log")
    .select("*")
    .eq("record_id", patientId)
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) throw new Error(error.message);
  return data as AuditLogEntry[];
}

export async function getStaffMembers(): Promise<StaffMember[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("staff_members")
    .select("*")
    .order("full_name", { ascending: true });

  if (error) throw new Error(error.message);
  return data as StaffMember[];
}

type ShiftRow = {
  id: string;
  staff_member_id: string;
  shift_date: string;
  shift_type: Shift["shift_type"];
  start_time: string;
  end_time: string;
  notes: string | null;
  staff_members: { full_name: string } | null;
};

export async function getShiftsForMonth(year: number, month: number): Promise<Shift[]> {
  const supabase = createClient();
  const start = `${year}-${String(month).padStart(2, "0")}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const end = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;

  const { data, error } = await supabase
    .from("shifts")
    .select("*, staff_members(full_name)")
    .gte("shift_date", start)
    .lte("shift_date", end)
    .order("start_time", { ascending: true });

  if (error) throw new Error(error.message);
  return (data as unknown as ShiftRow[]).map((r) => ({
    id: r.id,
    staff_member_id: r.staff_member_id,
    shift_date: r.shift_date,
    shift_type: r.shift_type,
    start_time: r.start_time,
    end_time: r.end_time,
    notes: r.notes,
    staff_name: r.staff_members?.full_name ?? "Unknown",
  }));
}

type VisitRow = {
  id: string;
  staff_member_id: string;
  patient_id: string;
  visit_date: string;
  sequence_order: number;
  scheduled_time: string | null;
  duration_minutes: number | null;
  visit_type: Visit["visit_type"];
  status: Visit["status"];
  notes: string | null;
  staff_members: { full_name: string } | null;
  patients: { full_name: string; address: string | null } | null;
};

export async function getVisitsForWeek(startDateKey: string, endDateKey: string): Promise<Visit[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("visits")
    .select("*, staff_members(full_name), patients(full_name, address)")
    .gte("visit_date", startDateKey)
    .lte("visit_date", endDateKey)
    .order("visit_date", { ascending: true })
    .order("sequence_order", { ascending: true });

  if (error) throw new Error(error.message);
  return (data as unknown as VisitRow[]).map((r) => ({
    id: r.id,
    staff_member_id: r.staff_member_id,
    patient_id: r.patient_id,
    visit_date: r.visit_date,
    sequence_order: r.sequence_order,
    scheduled_time: r.scheduled_time,
    duration_minutes: r.duration_minutes,
    visit_type: r.visit_type,
    status: r.status,
    notes: r.notes,
    staff_name: r.staff_members?.full_name ?? "Unknown",
    patient_name: r.patients?.full_name ?? "Unknown",
    patient_address: r.patients?.address ?? null,
  }));
}

export async function getBookingRequests(): Promise<BookingRequest[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("booking_requests")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return data as BookingRequest[];
}

export async function getInsuranceRates(): Promise<InsuranceRate[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("insurance_rates")
    .select("*")
    .order("pflegegrad", { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []).map((r: any) => ({
    id: r.id,
    pflegegrad: r.pflegegrad,
    pflegesachleistung_monthly: Number(r.pflegesachleistung_monthly),
    pflegegeld_monthly: Number(r.pflegegeld_monthly),
    entlastungsbetrag_monthly: Number(r.entlastungsbetrag_monthly),
    effective_from: r.effective_from,
    notes: r.notes,
  })) as InsuranceRate[];
}

export async function getDocuments(): Promise<Document[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("documents")
    .select("*, patients(full_name)")
    .order("folder", { ascending: true })
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data as any[]).map((r) => ({
    id: r.id,
    title: r.title,
    category: r.category,
    folder: r.folder,
    patient_id: r.patient_id,
    content: r.content,
    file_path: r.file_path,
    file_name: r.file_name,
    created_at: r.created_at,
    patient_name: r.patients?.full_name,
  }));
}

export async function getDocumentFolders(): Promise<string[]> {
  const supabase = createClient();
  const { data, error } = await supabase.from("documents").select("folder");
  if (error) throw new Error(error.message);
  const folders = new Set((data ?? []).map((r: any) => r.folder as string));
  return Array.from(folders).sort();
}
