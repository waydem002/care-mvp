import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendWhatsAppMedicationReminder } from "@/lib/whatsapp";

type DueReminderRow = {
  id: string;
  scheduled_for: string;
  patient_id: string;
  medications: { name: string; dosage: string | null } | null;
  patients: { full_name: string; phone: string | null } | null;
};

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const now = new Date();
  // Only reach back 60 minutes: anything older that's still pending is close
  // to sweep_missed_reminders' 90-minute cutoff — better to let it become
  // "missed" than send a very late reminder that looks like it went out on time.
  const lookback = new Date(now.getTime() - 60 * 60 * 1000);

  const { data, error } = await supabase
    .from("reminders")
    .select("id, scheduled_for, patient_id, medications(name, dosage), patients(full_name, phone)")
    .eq("status", "pending")
    .lte("scheduled_for", now.toISOString())
    .gte("scheduled_for", lookback.toISOString());

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const dueReminders = data as unknown as DueReminderRow[];
  const results: { reminder_id: string; outcome: string }[] = [];

  for (const reminder of dueReminders) {
    const patient = reminder.patients;
    const medication = reminder.medications;

    const { data: consent } = await supabase
      .from("consents")
      .select("id")
      .eq("patient_id", reminder.patient_id)
      .eq("consent_type", "whatsapp_communication")
      .eq("granted", true)
      .is("revoked_at", null)
      .maybeSingle();

    if (!consent) {
      await supabase.from("notifications").insert({
        reminder_id: reminder.id,
        channel: "whatsapp",
        recipient_phone: patient?.phone ?? null,
        status: "failed",
        error: "No active WhatsApp consent on file for this patient.",
      });
      results.push({ reminder_id: reminder.id, outcome: "skipped_no_consent" });
      continue;
    }

    const time = new Date(reminder.scheduled_for).toLocaleTimeString("de-DE", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Europe/Berlin",
    });

    const sendResult = await sendWhatsAppMedicationReminder({
      toPhone: patient?.phone ?? null,
      patientName: patient?.full_name ?? "Patient",
      medicationName: medication?.name ?? "Medikament",
      dosage: medication?.dosage ?? null,
      time,
    });

    if (sendResult.status === "sent") {
      await supabase.from("notifications").insert({
        reminder_id: reminder.id,
        channel: "whatsapp",
        recipient_phone: patient?.phone ?? null,
        status: "sent",
        provider_message_id: sendResult.providerMessageId,
      });
      await supabase
        .from("reminders")
        .update({ status: "sent", sent_at: new Date().toISOString() })
        .eq("id", reminder.id);
    } else if (sendResult.status === "dry_run") {
      await supabase.from("notifications").insert({
        reminder_id: reminder.id,
        channel: "whatsapp",
        recipient_phone: patient?.phone ?? null,
        status: "queued",
        error: sendResult.note,
      });
      // Reminder deliberately stays "pending" — nothing was actually sent yet.
    } else {
      await supabase.from("notifications").insert({
        reminder_id: reminder.id,
        channel: "whatsapp",
        recipient_phone: patient?.phone ?? null,
        status: "failed",
        error: sendResult.error,
      });
    }

    results.push({ reminder_id: reminder.id, outcome: sendResult.status });
  }

  return NextResponse.json({ processed: results.length, results });
}
