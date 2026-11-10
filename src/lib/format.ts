import type { Timestamp } from "firebase/firestore";

export function fmtDate(iso: string | null | undefined) {
  if (!iso) return "-";
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric" });
}

export function fmtTs(ts: Timestamp | null | undefined) {
  if (!ts) return "-";
  return ts.toDate().toLocaleString("th-TH", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const AUTH_MESSAGES: Record<string, string> = {
  "auth/invalid-credential": "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง",
  "auth/wrong-password": "รหัสผ่านไม่ถูกต้อง",
  "auth/user-not-found": "ไม่พบชื่อผู้ใช้นี้",
  "auth/invalid-email": "ชื่อผู้ใช้ไม่ถูกต้อง",
  "auth/email-already-in-use": "ชื่อผู้ใช้นี้ถูกใช้แล้ว",
  "auth/weak-password": "รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร",
  "auth/too-many-requests": "พยายามหลายครั้งเกินไป กรุณารอสักครู่แล้วลองใหม่",
  "auth/network-request-failed": "เชื่อมต่อเครือข่ายไม่ได้",
  "auth/requires-recent-login": "กรุณาเข้าสู่ระบบใหม่แล้วลองอีกครั้ง",
  "permission-denied": "ไม่มีสิทธิ์ทำรายการนี้",
  unavailable: "เชื่อมต่อฐานข้อมูลไม่ได้ กรุณาลองใหม่",
};

/** Turn any thrown value into a readable Thai message. */
export function errMsg(e: unknown): string {
  const code = (e as { code?: string })?.code;
  if (code && AUTH_MESSAGES[code]) return AUTH_MESSAGES[code];
  if (e instanceof Error && e.message) return e.message.replace(/^Firebase:\s*/, "");
  return "เกิดข้อผิดพลาด กรุณาลองใหม่";
}
