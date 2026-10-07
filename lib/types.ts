export type ReminderStatus = "pending" | "sent" | "confirmed" | "missed";

export type Patient = {
  id: string;
  full_name: string;
  date_of_birth: string | null;
  pflegegrad: number | null;
  address: string | null;
  phone: string | null;
  notes: string | null;
  active: boolean;
  created_at: string;
};

export type Medication = {
  id: string;
  patient_id: string;
  name: string;
  dosage: string | null;
  times: string[];
  active: boolean;
  created_at: string;
};

export type Reminder = {
  id: string;
  medication_id: string;
  patient_id: string;
  scheduled_for: string;
  status: ReminderStatus;
  sent_at: string | null;
  confirmed_at: string | null;
  created_at: string;
  // joined fields, populated by the reminders query
  patient_name?: string;
  medication_name?: string;
  dosage?: string | null;
};

export type ConsentType = "data_processing" | "whatsapp_communication" | "family_portal_sharing";

export type Consent = {
  id: string;
  patient_id: string;
  consent_type: ConsentType;
  granted: boolean;
  granted_at: string;
  revoked_at: string | null;
};

export type DeletionRequestStatus = "pending" | "completed" | "rejected";

export type DeletionRequest = {
  id: string;
  patient_id: string;
  requested_at: string;
  reason: string | null;
  status: DeletionRequestStatus;
  completed_at: string | null;
};

export type AuditLogEntry = {
  id: string;
  action: string;
  table_name: string;
  record_id: string;
  changes: Record<string, unknown> | null;
  created_at: string;
};

export type StaffRole = "nurse" | "caregiver" | "driver" | "admin" | "other";

export type StaffMember = {
  id: string;
  full_name: string;
  role: StaffRole;
  phone: string | null;
  email: string | null;
  active: boolean;
  created_at: string;
};

export type ShiftType = "fruehdienst" | "spaetdienst" | "nachtdienst" | "bereitschaft" | "custom";

export type Shift = {
  id: string;
  staff_member_id: string;
  shift_date: string;
  shift_type: ShiftType;
  start_time: string;
  end_time: string;
  notes: string | null;
  staff_name?: string;
};

export type VisitType = "care" | "medication" | "check_in" | "other";
export type VisitStatus = "planned" | "completed" | "cancelled";

export type Visit = {
  id: string;
  staff_member_id: string;
  patient_id: string;
  visit_date: string;
  sequence_order: number;
  scheduled_time: string | null;
  duration_minutes: number | null;
  visit_type: VisitType;
  status: VisitStatus;
  notes: string | null;
  staff_name?: string;
  patient_name?: string;
  patient_address?: string | null;
};

export type RequestType = "consultation" | "schedule_change" | "extra_visit" | "callback" | "other";
export type BookingRequestStatus = "pending" | "approved" | "rejected" | "completed";

export type BookingRequest = {
  id: string;
  requester_name: string;
  requester_phone: string | null;
  requester_email: string | null;
  patient_name: string | null;
  request_type: RequestType;
  preferred_date: string | null;
  preferred_time: string | null;
  message: string | null;
  status: BookingRequestStatus;
  admin_notes: string | null;
  linked_patient_id: string | null;
  created_at: string;
};

export type InsuranceRate = {
  id: string;
  pflegegrad: number;
  pflegesachleistung_monthly: number;
  pflegegeld_monthly: number;
  entlastungsbetrag_monthly: number;
  effective_from: string;
  notes: string | null;
};

export type DocumentCategory = "policy" | "procedure" | "general" | "patient_note";

export type Document = {
  id: string;
  title: string;
  category: DocumentCategory;
  folder: string;
  patient_id: string | null;
  content: string;
  file_path: string | null;
  file_name: string | null;
  created_at: string;
  patient_name?: string;
};
