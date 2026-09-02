import { createClient } from "@/lib/supabase/server";
import type { Reminder, Patient, Medication } from "@/lib/types";

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
