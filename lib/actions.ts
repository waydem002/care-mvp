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

  const { error } = await supabase.from("patients").insert({
    full_name: formData.get("full_name") as string,
    date_of_birth: (formData.get("date_of_birth") as string) || null,
    pflegegrad: formData.get("pflegegrad") ? Number(formData.get("pflegegrad")) : null,
    address: (formData.get("address") as string) || null,
    phone: (formData.get("phone") as string) || null,
    notes: (formData.get("notes") as string) || null,
    created_by: user?.id ?? null,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/patients");
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
