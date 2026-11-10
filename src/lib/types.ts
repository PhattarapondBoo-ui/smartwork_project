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
