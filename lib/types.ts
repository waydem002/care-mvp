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
