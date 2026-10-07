// WhatsApp Business Platform (Meta Cloud API) sender.
//
// Important: the Cloud API does NOT allow arbitrary free-text messages for
// business-initiated conversations like medication reminders — only
// pre-approved message *templates* can be sent outside a 24h customer-service
// window. A template (e.g. "medication_reminder") must be created and
// approved in Meta Business Manager before this will actually deliver
// anything. See README for the full setup checklist.
//
// If WHATSAPP_ACCESS_TOKEN / WHATSAPP_PHONE_NUMBER_ID aren't set, this runs
// in dry-run mode: it validates everything except the actual network call,
// so the rest of the pipeline (consent checks, reminder selection, logging)
// is fully testable before real Meta credentials exist.

export type SendResult =
  | { status: "sent"; providerMessageId: string }
  | { status: "failed"; error: string }
  | { status: "dry_run"; note: string };

function normalizePhoneForWhatsApp(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const digits = raw.replace(/[^\d]/g, "");
  // WhatsApp Cloud API expects digits only, with country code, no leading zero/plus.
  return digits.length >= 10 ? digits : null;
}

export async function sendWhatsAppMedicationReminder(params: {
  toPhone: string | null;
  patientName: string;
  medicationName: string;
  dosage: string | null;
  time: string;
}): Promise<SendResult> {
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const templateName = process.env.WHATSAPP_TEMPLATE_NAME || "medication_reminder";

  if (!accessToken || !phoneNumberId) {
    return { status: "dry_run", note: "WhatsApp credentials not configured — no message sent (dry run)." };
  }

  const to = normalizePhoneForWhatsApp(params.toPhone);
  if (!to) {
    return { status: "failed", error: "Patient has no valid phone number on file." };
  }

  try {
    const res = await fetch(`https://graph.facebook.com/v20.0/${phoneNumberId}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to,
        type: "template",
        template: {
          name: templateName,
          language: { code: "de" },
          components: [
            {
              type: "body",
              parameters: [
                { type: "text", text: params.patientName },
                { type: "text", text: params.medicationName },
                { type: "text", text: params.dosage ?? "" },
                { type: "text", text: params.time },
              ],
            },
          ],
        },
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      return { status: "failed", error: data?.error?.message ?? `WhatsApp API error (HTTP ${res.status})` };
    }

    return { status: "sent", providerMessageId: data?.messages?.[0]?.id ?? "unknown" };
  } catch (err) {
    return { status: "failed", error: err instanceof Error ? err.message : "Unknown error calling WhatsApp API" };
  }
}
