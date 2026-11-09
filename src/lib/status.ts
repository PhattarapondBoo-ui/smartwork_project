import type { DisplayStatus, Task } from "./types";

export const STATUS_META: Record<DisplayStatus, { label: string; en: string; cls: string }> = {
  open: { label: "เปิดรับงาน", en: "Open", cls: "bg-sky-50 text-sky-700 ring-sky-200" },
  claimed: { label: "รับงานแล้ว", en: "Claimed", cls: "bg-indigo-50 text-indigo-700 ring-indigo-200" },
  in_progress: { label: "กำลังดำเนินการ", en: "In Progress", cls: "bg-amber-50 text-amber-700 ring-amber-200" },
  pending_review: { label: "รอตรวจสอบ", en: "Pending Review", cls: "bg-orange-50 text-orange-700 ring-orange-200" },
  approved: { label: "อนุมัติแล้ว", en: "Approved", cls: "bg-green-50 text-green-700 ring-green-200" },
  rejected: { label: "ส่งกลับแก้ไข", en: "Rejected", cls: "bg-red-50 text-red-700 ring-red-200" },
  archived: { label: "เก็บถาวร", en: "Archived", cls: "bg-gray-100 text-gray-600 ring-gray-300" },
};

export function displayStatus(t: Task): DisplayStatus {
  return t.is_archived ? "archived" : t.status;
}

/** A task can be claimed by `uid` when it is open and nobody else holds it. */
export function canClaim(t: Task, uid: string) {
  if (t.is_archived || t.status !== "open") return false;
  return t.assigned_type === "all" ? !t.assigned_user : t.assigned_user === uid;
}

/** Statuses in which the assignee can still submit work. */
export const SUBMITTABLE: Task["status"][] = ["claimed", "in_progress", "rejected"];

export function todayISO() {
  return new Date().toLocaleDateString("en-CA"); // YYYY-MM-DD in local time
}

export function isOverdue(t: Task) {
  return !t.is_archived && t.status !== "approved" && !!t.due_date && t.due_date < todayISO();
}

export function assigneeLabel(t: Task) {
  if (t.assigned_type === "all") {
    return t.assigned_user_name ? `${t.assigned_user_name} (รับจากงานทุกคน)` : "ทุกคน";
  }
  return t.assigned_user_name ?? "-";
}
