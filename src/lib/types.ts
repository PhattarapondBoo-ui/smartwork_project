import type { Timestamp } from "firebase/firestore";

export type Role = "employer" | "employee";
export type UserStatus = "active" | "inactive";

export type TaskStatus =
  | "open"
  | "claimed"
  | "in_progress"
  | "pending_review"
  | "approved"
  | "rejected";

/** What the UI shows: archived overrides the underlying status. */
export type DisplayStatus = TaskStatus | "archived";

export type AssignedType = "all" | "user";
export type ReviewStatus = "pending" | "approved" | "rejected";

/** Firestore: users/{uid}. Passwords live in Firebase Auth, never in Firestore. */
export interface AppUser {
  id: string;
  username: string;
  name: string;
  phone?: string;
  /** PromptPay ID for receiving pay (mobile 10 digits / national ID 13 / e-wallet 15). Digits only. */
  promptpay_id?: string;
  role: Role;
  status: UserStatus;
  created_at: Timestamp | null;
  updated_at?: Timestamp | null;
}

/** Firestore: tasks/{id} */
export interface Task {
  id: string;
  code: string;
  title: string;
  description: string;
  location: string;
  assigned_type: AssignedType;
  /** uid of the one person responsible. For "all" tasks it is null until someone claims it. */
  assigned_user: string | null;
  assigned_user_name: string | null;
  status: TaskStatus;
  /** YYYY-MM-DD */
  due_date: string;
  is_archived: boolean;
  archived_at: Timestamp | null;
  created_by: string;
  created_by_name: string;
  created_at: Timestamp | null;
  updated_at: Timestamp | null;
  claimed_at: Timestamp | null;
  last_submitted_at: Timestamp | null;
  /** Set by the old-image cleanup once every submission of this task has had its photos removed. */
  images_cleaned_at?: Timestamp | null;
  /** Pay for this task in baht (0 / missing = not set). */
  price?: number;
  /** Set when the employer records the payment that covers this task. */
  payment_id?: string | null;
  paid_at?: Timestamp | null;
}

/** Firestore: tasks/{taskId}/submissions/{id} */
export interface Submission {
  id: string;
  task_id: string;
  user_id: string;
  user_name: string;
  note: string;
  /** Images live in tasks/{taskId}/submissions/{id}/images/{imageId} as { data, index }. */
  image_count: number;
  /** When the photos were removed by the automatic cleanup (note and review are kept). */
  images_deleted_at?: Timestamp | null;
  submitted_at: Timestamp | null;
  review_status: ReviewStatus;
  review_note: string;
  reviewed_by: string | null;
  reviewed_by_name: string | null;
  reviewed_at: Timestamp | null;
}

/**
 * Firestore: payments/{id}. A record that the employer paid an employee for one
 * or more approved tasks (the transfer itself happens in a banking app).
 * Task titles/codes are copied in so history survives if a task is deleted.
 */
export interface Payment {
  id: string;
  employee_id: string;
  employee_name: string;
  promptpay_id: string;
  /** Gross pay for the tasks (sum of task prices). */
  amount: number;
  /** Withholding tax deducted (0 if none). Missing on older records = 0. */
  withholding_tax?: number;
  /** What was actually transferred (amount - withholding_tax). Missing on older records = amount. */
  net_amount?: number;
  task_ids: string[];
  task_codes: string[];
  task_titles: string[];
  note: string;
  /** Transfer slip photo as a JPEG data URL ("" if none). */
  slip: string;
  paid_by: string;
  paid_by_name: string;
  paid_at: Timestamp | null;
  /** When the employee confirmed they received the money. */
  confirmed_at: Timestamp | null;
}

/** Firestore: meta/settings — app-wide settings an employer can change. */
export interface AppSettings {
  withholding_enabled: boolean;
}
