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

/** Due date as a short relative phrase with a tone, e.g. "เหลือ 2 วัน" / "เลยกำหนด 1 วัน". */
export function dueInfo(t: Task): { label: string; tone: "muted" | "ok" | "soon" | "late" } {
  if (!t.due_date) return { label: "ไม่มีกำหนด", tone: "muted" };
  if (t.is_archived || t.status === "approved") return { label: `กำหนด ${shortDate(t.due_date)}`, tone: "muted" };
  const today = new Date(`${todayISO()}T00:00:00`).getTime();
  const due = new Date(`${t.due_date}T00:00:00`).getTime();
  const days = Math.round((due - today) / 86_400_000);
  if (days < 0) return { label: `เลยกำหนด ${-days} วัน`, tone: "late" };
  if (days === 0) return { label: "ครบกำหนดวันนี้", tone: "soon" };
  if (days === 1) return { label: "ครบกำหนดพรุ่งนี้", tone: "soon" };
  return { label: `เหลือ ${days} วัน`, tone: "ok" };
}

function shortDate(iso: string) {
  return new Date(`${iso}T00:00:00`).toLocaleDateString("th-TH", { day: "numeric", month: "short" });
}

export function assigneeLabel(t: Task) {
  if (t.assigned_type === "all") {
    return t.assigned_user_name ? `${t.assigned_user_name} (รับจากงานทุกคน)` : "ทุกคน";
  }
  return t.assigned_user_name ?? "-";
}
