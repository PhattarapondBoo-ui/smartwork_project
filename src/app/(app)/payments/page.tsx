"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  CalendarRange,
  CheckCircle2,
  Download,
  History,
  ImagePlus,
  Landmark,
  Receipt,
  Wallet,
  X,
} from "lucide-react";
import { useProfile } from "@/lib/auth-context";
import {
  confirmPaymentReceived,
  recordPayment,
  setWithholdingEnabled,
  subscribeAllTasks,
  subscribeEmployeeTasks,
  subscribePayments,
  subscribeSettings,
  subscribeUsers,
} from "@/lib/api";
import { errMsg, fmtTs } from "@/lib/format";
import { formatBaht, formatPromptPayId, maskPromptPayId, promptpayRisk, type PromptPayRisk } from "@/lib/promptpay";
import { isUnpaid } from "@/lib/status";
import { WITHHOLDING_RATE, WITHHOLDING_THRESHOLD, payBreakdown } from "@/lib/tax";
import type { AppSettings, AppUser, Payment, Task } from "@/lib/types";
import { Avatar } from "@/components/AppShell";
import { PromptPayQR } from "@/components/PromptPayQR";
import { useToast } from "@/components/toast";
import { Alert, Button, Card, EmptyState, Field, Modal, PageHero, SectionTitle, Spinner, Textarea, cn } from "@/components/ui";

const sum = (tasks: { price?: number }[]) => tasks.reduce((s, t) => s + (t.price ?? 0), 0);
const netOf = (p: Payment) => p.net_amount ?? p.amount;
const whtOf = (p: Payment) => p.withholding_tax ?? 0;

/** "2026-11" for a payment (local time). */
function monthKeyOf(p: Payment) {
  const d = p.paid_at?.toDate();
  return d ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}` : "";
}
function currentMonthKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
function monthLabel(key: string) {
  const [y, m] = key.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("th-TH", { month: "long", year: "numeric" });
}

export default function PaymentsPage() {
  const me = useProfile();
  const [tasks, setTasks] = useState<Task[] | null>(null);
  const [payments, setPayments] = useState<Payment[] | null>(null);
  const [users, setUsers] = useState<AppUser[]>([]);
  const [settings, setSettings] = useState<AppSettings>({ withholding_enabled: false });
  const [error, setError] = useState<string | null>(null);
  const [payError, setPayError] = useState<string | null>(null);
  const isEmployer = me.role === "employer";

  useEffect(() => {
    const onErr = (e: Error) => setError(errMsg(e));
    return isEmployer ? subscribeAllTasks(setTasks, onErr) : subscribeEmployeeTasks(me.id, setTasks, onErr);
  }, [isEmployer, me.id]);
  useEffect(
    () =>
      subscribePayments(me, setPayments, (e) => {
        // Keep the page usable (e.g. rules not yet published); show a warning instead.
        setPayError(errMsg(e));
        setPayments([]);
      }),
    [me],
  );
  useEffect(() => subscribeSettings(setSettings), []);
  useEffect(() => {
    if (!isEmployer) return;
    return subscribeUsers(setUsers, (e) => setError(errMsg(e)));
  }, [isEmployer]);

  if (error) return <Alert kind="error">{error}</Alert>;
  if (!tasks || !payments) return <Spinner />;

  return (
    <>
      {payError && (
        <div className="mb-4">
          <Alert kind="warning">โหลดประวัติการจ่ายไม่ได้ ({payError}) — ตรวจว่าได้ Publish firestore.rules ล่าสุดแล้ว</Alert>
        </div>
      )}
      {isEmployer ? (
        <EmployerPayments me={me} tasks={tasks} payments={payments} users={users} settings={settings} />
      ) : (
        <EmployeePayments me={me} tasks={tasks} payments={payments} />
      )}
    </>
  );
}

/* ====================================================================== */
/*  Admin (employer role)                                                 */
/* ====================================================================== */

function EmployerPayments({
  me,
  tasks,
  payments,
  users,
  settings,
}: {
  me: AppUser;
  tasks: Task[];
  payments: Payment[];
  users: AppUser[];
  settings: AppSettings;
}) {
  const [paying, setPaying] = useState<{ employee: AppUser; tasks: Task[] } | null>(null);

  const unpaid = tasks.filter(isUnpaid);
  const noPrice = tasks.filter((t) => t.status === "approved" && !(t.price ?? 0) && !t.payment_id && !t.is_archived);
  const usersById = new Map(users.map((u) => [u.id, u]));
  // PromptPay used for each person's most recent payment (payments are newest first).
  const lastPaidPromptpay = useMemo(() => {
    const m = new Map<string, string>();
    for (const p of payments) if (p.promptpay_id && !m.has(p.employee_id)) m.set(p.employee_id, p.promptpay_id);
    return m;
  }, [payments]);

  // Group unpaid tasks by the freelancer who did them.
  const groups = useMemo(() => {
    const m = new Map<string, Task[]>();
    for (const t of unpaid) {
      if (!t.assigned_user) continue;
      m.set(t.assigned_user, [...(m.get(t.assigned_user) ?? []), t]);
    }
    return [...m.entries()].sort((a, b) => sum(b[1]) - sum(a[1]));
  }, [unpaid]);

  const paidThisMonth = payments.filter((p) => monthKeyOf(p) === currentMonthKey()).reduce((s, p) => s + netOf(p), 0);

  return (
    <>
      <PageHero eyebrow="การเงิน" title="ค่าตอบแทนผู้รับจ้าง" subtitle="สร้าง QR พร้อมเพย์ โอนผ่านแอปธนาคาร แล้วแนบสลิปเก็บเป็นหลักฐาน">
        <div className="flex flex-wrap gap-3">
          <HeroStat label="ค้างจ่ายทั้งหมด" value={formatBaht(sum(unpaid))} />
          <HeroStat label="รายการรอจ่าย" value={`${unpaid.length} งาน`} />
          <HeroStat label="โอนแล้วเดือนนี้" value={formatBaht(paidThisMonth)} />
        </div>
      </PageHero>

      <WithholdingSetting enabled={settings.withholding_enabled} />

      <section className="mt-8">
        <SectionTitle icon={Wallet} title="รอจ่าย" hint="งานที่อนุมัติแล้ว แยกตามผู้รับจ้าง" />
        {groups.length === 0 ? (
          <EmptyState>ไม่มีค่าตอบแทนค้างจ่าย 🎉</EmptyState>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {groups.map(([uid, list]) => {
              const employee =
                usersById.get(uid) ??
                ({ id: uid, name: list[0].assigned_user_name ?? "-", username: "", role: "employee", status: "active", created_at: null } as AppUser);
              return (
                <EmployeeDueCard
                  key={uid}
                  employee={employee}
                  tasks={list}
                  withholdingEnabled={settings.withholding_enabled}
                  risk={promptpayRisk(employee, lastPaidPromptpay.get(uid))}
                  onPay={(sel) => setPaying({ employee, tasks: sel })}
                />
              );
            })}
          </div>
        )}
      </section>

      {noPrice.length > 0 && (
        <div className="mt-6">
          <Alert kind="warning">
            <span className="font-medium">มี {noPrice.length} งานที่อนุมัติแล้วแต่ยังไม่กำหนดค่าตอบแทน:</span>{" "}
            {noPrice.map((t, i) => (
              <span key={t.id}>
                {i > 0 && ", "}
                <Link href={`/tasks/${t.id}`} className="underline">
                  {t.code} {t.title}
                </Link>
              </span>
            ))}
          </Alert>
        </div>
      )}

      <section className="mt-10">
        <MonthlySummary payments={payments} />
      </section>

      <section className="mt-10">
        <SectionTitle icon={History} title="ประวัติการจ่าย" hint={`${payments.length} รายการ`} />
        <PaymentHistory payments={payments} viewer={me} />
      </section>

      {paying && (
        <PayModal
          me={me}
          employee={paying.employee}
          tasks={paying.tasks}
          withholdingEnabled={settings.withholding_enabled}
          risk={promptpayRisk(paying.employee, lastPaidPromptpay.get(paying.employee.id))}
          onClose={() => setPaying(null)}
        />
      )}
    </>
  );
}

function HeroStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-[8rem] rounded-lg bg-white/10 px-4 py-3 ring-1 ring-white/20">
      <div className="text-xl font-semibold text-white sm:text-2xl">{value}</div>
      <div className="text-xs font-light text-brand-100">{label}</div>
    </div>
  );
}

/** On/off switch for 3% withholding tax, with a plain-language explanation. */
function WithholdingSetting({ enabled }: { enabled: boolean }) {
  const toast = useToast();
  const [saving, setSaving] = useState(false);
  const toggle = async () => {
    const next = !enabled;
    if (
      next &&
      !window.confirm(
        `เปิดการหักภาษี ณ ที่จ่าย ${WITHHOLDING_RATE * 100}%?\n\nใช้เมื่อผู้จ่ายเป็นนิติบุคคล (บริษัท/ห้าง) และจ่ายครั้งละ ${formatBaht(
          WITHHOLDING_THRESHOLD,
        )} ขึ้นไป — แนะนำให้ถามสำนักงานบัญชีก่อนเปิด`,
      )
    )
      return;
    setSaving(true);
    try {
      await setWithholdingEnabled(next);
      toast.success(next ? "เปิดการหักภาษี ณ ที่จ่ายแล้ว" : "ปิดการหักภาษี ณ ที่จ่ายแล้ว");
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="flex flex-wrap items-center gap-4 p-5">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-brand-50 text-brand-600">
        <Landmark className="h-5 w-5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-medium text-gray-900">หักภาษี ณ ที่จ่าย {WITHHOLDING_RATE * 100}%</p>
        <p className="text-sm text-gray-500">
          {enabled
            ? `เปิดอยู่ — การจ่ายครั้งละ ${formatBaht(WITHHOLDING_THRESHOLD)} ขึ้นไปจะหัก ${WITHHOLDING_RATE * 100}% และ QR จะเป็นยอดหลังหักภาษี`
            : "ปิดอยู่ — เปิดเมื่อผู้จ่ายเป็นนิติบุคคล (บริษัท/ห้าง) ตามคำแนะนำของสำนักงานบัญชี"}
        </p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={enabled}
        aria-label="หักภาษี ณ ที่จ่าย"
        disabled={saving}
        onClick={() => void toggle()}
        className={cn("relative h-7 w-12 shrink-0 rounded-full transition disabled:opacity-50", enabled ? "bg-brand-600" : "bg-gray-300")}
      >
        <span className={cn("absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all", enabled ? "left-6" : "left-1")} />
      </button>
    </Card>
  );
}

function EmployeeDueCard({
  employee,
  tasks,
  withholdingEnabled,
  risk,
  onPay,
}: {
  employee: AppUser;
  tasks: Task[];
  withholdingEnabled: boolean;
  risk: PromptPayRisk | null;
  onPay: (selected: Task[]) => void;
}) {
  const [selected, setSelected] = useState<Set<string>>(() => new Set(tasks.map((t) => t.id)));
  // Keep the selection in sync when tasks are added/removed live.
  useEffect(() => setSelected(new Set(tasks.map((t) => t.id))), [tasks]);

  const chosen = tasks.filter((t) => selected.has(t.id));
  const pay = payBreakdown(sum(chosen), withholdingEnabled);
  const toggle = (id: string) =>
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  return (
    <Card className="p-5 sm:p-6">
      <div className="flex items-center gap-3">
        <Avatar name={employee.name} className="h-11 w-11 text-base" />
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium text-gray-900">{employee.name}</p>
          {employee.promptpay_id ? (
            <>
              <p className="text-xs text-gray-500">พร้อมเพย์ {formatPromptPayId(employee.promptpay_id)}</p>
              {risk && (
                <p className="mt-1 inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-800 ring-1 ring-amber-200">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  {risk.recent ? "เพิ่งเปลี่ยนพร้อมเพย์" : "พร้อมเพย์ไม่ตรงกับครั้งก่อน"}
                </p>
              )}
            </>
          ) : (
            <p className="flex items-center gap-1 text-xs text-amber-700">
              <AlertTriangle className="h-3.5 w-3.5" /> ยังไม่ได้ตั้งพร้อมเพย์
            </p>
          )}
        </div>
        <div className="text-right">
          <p className="text-xl font-semibold text-gray-900">{formatBaht(sum(tasks))}</p>
          <p className="text-xs text-gray-500">{tasks.length} งาน</p>
        </div>
      </div>

      <ul className="mt-4 divide-y divide-gray-100 rounded-lg ring-1 ring-gray-100">
        {tasks.map((t) => (
          <li key={t.id}>
            <label className="flex cursor-pointer items-center gap-3 px-3 py-2.5 hover:bg-gray-50">
              <input
                type="checkbox"
                checked={selected.has(t.id)}
                onChange={() => toggle(t.id)}
                className="h-4 w-4 accent-[var(--color-brand-600)]"
              />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm text-gray-900">{t.title}</span>
                <span className="block text-xs text-gray-400">{t.code}</span>
              </span>
              <span className="text-sm font-medium text-gray-700">{formatBaht(t.price ?? 0)}</span>
            </label>
          </li>
        ))}
      </ul>

      <Button className="mt-4 w-full" disabled={chosen.length === 0} onClick={() => onPay(chosen)}>
        <Wallet className="h-4 w-4" /> จ่ายเงิน {chosen.length > 0 && formatBaht(pay.net)}
      </Button>
      {pay.withholding > 0 && (
        <p className="mt-2 text-center text-xs text-gray-500">
          ยอดเต็ม {formatBaht(pay.gross)} หักภาษี {formatBaht(pay.withholding)}
        </p>
      )}
    </Card>
  );
}

function PayModal({
  me,
  employee,
  tasks,
  withholdingEnabled,
  risk,
  onClose,
}: {
  me: AppUser;
  employee: AppUser;
  tasks: Task[];
  withholdingEnabled: boolean;
  risk: PromptPayRisk | null;
  onClose: () => void;
}) {
  // If the PromptPay changed, hide the QR until the admin confirms it with the person.
  const [verified, setVerified] = useState(!risk);
  const toast = useToast();
  const pay = payBreakdown(sum(tasks), withholdingEnabled);
  const fileRef = useRef<HTMLInputElement>(null);
  const [slip, setSlip] = useState<{ file: File; url: string } | null>(null);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(
    () => () => {
      if (slip) URL.revokeObjectURL(slip.url);
    },
    [slip],
  );

  const save = async () => {
    setError(null);
    if (!slip && !window.confirm("ยังไม่ได้แนบสลิป บันทึกว่าจ่ายแล้วเลยหรือไม่?")) return;
    setSaving(true);
    try {
      await recordPayment({ employee, tasks, note, slip: slip?.file ?? null, withholdingEnabled }, me);
      toast.success(`บันทึกการจ่าย ${formatBaht(pay.net)} ให้ ${employee.name} แล้ว`);
      onClose();
    } catch (e) {
      setError(errMsg(e));
      setSaving(false);
    }
  };

  return (
    <Modal open onClose={onClose} title={`จ่ายเงินให้ ${employee.name}`}>
      <div className="space-y-5">
        {error && <Alert kind="error">{error}</Alert>}

        {risk && (
          <div className="rounded-lg bg-amber-50 p-4 text-sm text-amber-900 ring-1 ring-amber-200">
            <p className="flex items-center gap-1.5 font-semibold">
              <AlertTriangle className="h-4 w-4" /> ตรวจสอบพร้อมเพย์ก่อนโอน
            </p>
            <p className="mt-1.5 leading-relaxed">
              {risk.recent && risk.changedAt
                ? `${employee.name} เปลี่ยนพร้อมเพย์เมื่อ ${risk.changedAt.toLocaleString("th-TH", { dateStyle: "medium", timeStyle: "short" })}`
                : `พร้อมเพย์ของ ${employee.name} ไม่ตรงกับเลขที่ใช้โอนครั้งก่อน`}
              {risk.previous && ` (เดิมลงท้าย ${maskPromptPayId(risk.previous)} → ใหม่ ${formatPromptPayId(employee.promptpay_id)})`}
            </p>
            <p className="mt-1.5 leading-relaxed">
              ถ้าบัญชีของผู้รับจ้างถูกผู้อื่นเข้าใช้ เงินอาจถูกโอนไปผิดคน — <strong>โทรหรือคุยกับ {employee.name} โดยตรง</strong>
              เพื่อยืนยันเลขใหม่ อย่ายืนยันผ่านข้อความในแอปหรือแชทอย่างเดียว
            </p>
            <label className="mt-3 flex cursor-pointer items-start gap-2 font-medium">
              <input
                type="checkbox"
                checked={verified}
                onChange={(e) => setVerified(e.target.checked)}
                className="mt-0.5 h-4 w-4 accent-[var(--color-brand-600)]"
              />
              ฉันยืนยันกับ {employee.name} โดยตรงแล้วว่าพร้อมเพย์ใหม่ถูกต้อง
            </label>
          </div>
        )}

        {employee.promptpay_id && !verified ? null : employee.promptpay_id ? (
          <>
            <PromptPayQR promptpayId={employee.promptpay_id} amount={pay.net} name={employee.name} />
            <ol className="space-y-1 text-sm text-gray-600">
              <li>1. เปิดแอปธนาคาร แล้วสแกน QR นี้ ยอด {formatBaht(pay.net)} จะขึ้นให้อัตโนมัติ</li>
              <li>
                2. <span className="font-medium text-gray-900">ตรวจชื่อผู้รับในแอปธนาคารให้ตรงกับ {employee.name}</span> ก่อนกดโอน
              </li>
              <li>3. แนบสลิป แล้วกด “บันทึกว่าจ่ายแล้ว”</li>
            </ol>
          </>
        ) : (
          <Alert kind="warning">
            {employee.name} ยังไม่ได้ตั้งพร้อมเพย์ในหน้าบัญชี จึงสร้าง QR ไม่ได้ ถ้าจ่ายด้วยวิธีอื่น (เช่น เงินสด) แล้ว ก็บันทึกการจ่ายได้เลย
          </Alert>
        )}

        <div className="rounded-lg bg-gray-50 p-3 text-sm">
          <p className="mb-1 font-medium text-gray-700">งานที่จ่ายรอบนี้ ({tasks.length})</p>
          {tasks.map((t) => (
            <div key={t.id} className="flex justify-between gap-3 text-gray-600">
              <span className="truncate">
                {t.code} {t.title}
              </span>
              <span>{formatBaht(t.price ?? 0)}</span>
            </div>
          ))}
          <div className="mt-1 flex justify-between border-t border-gray-200 pt-1 text-gray-700">
            <span>ค่าตอบแทนรวม</span>
            <span>{formatBaht(pay.gross)}</span>
          </div>
          {pay.withholding > 0 && (
            <div className="flex justify-between text-gray-700">
              <span>หักภาษี ณ ที่จ่าย {WITHHOLDING_RATE * 100}%</span>
              <span>−{formatBaht(pay.withholding)}</span>
            </div>
          )}
          <div className="flex justify-between font-semibold text-gray-900">
            <span>ยอดโอน</span>
            <span>{formatBaht(pay.net)}</span>
          </div>
        </div>
        {pay.withholding > 0 && (
          <p className="text-xs leading-relaxed text-gray-500">
            อย่าลืมนำส่งภาษีที่หักไว้ (ภ.ง.ด.3) และออกหนังสือรับรองการหักภาษี ณ ที่จ่าย (50 ทวิ) ให้ผู้รับจ้าง
          </p>
        )}

        <Field label="สลิปการโอน" hint="แนะนำให้แนบไว้เป็นหลักฐาน">
          {slip ? (
            <div className="relative w-32">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={slip.url} alt="สลิป" className="h-40 w-32 rounded-lg object-cover ring-1 ring-gray-200" />
              <button
                type="button"
                onClick={() => setSlip(null)}
                className="absolute right-1 top-1 rounded-full bg-black/60 p-1 text-white"
                aria-label="ลบสลิป"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="flex h-24 w-full flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-gray-300 text-sm text-gray-500 hover:border-brand-300 hover:text-brand-700"
            >
              <ImagePlus className="h-5 w-5" /> แนบรูปสลิป
            </button>
          )}
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) setSlip({ file: f, url: URL.createObjectURL(f) });
              e.target.value = "";
            }}
          />
        </Field>

        <Field label="หมายเหตุ">
          <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="เช่น ค่าตอบแทนสัปดาห์ที่ 2" className="min-h-[70px]" />
        </Field>

        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            ยกเลิก
          </Button>
          <Button loading={saving} disabled={!verified} onClick={() => void save()}>
            <CheckCircle2 className="h-4 w-4" /> บันทึกว่าจ่ายแล้ว
          </Button>
        </div>
      </div>
    </Modal>
  );
}

/* ---------------------------------------------------- monthly summary */

function csvCell(v: string | number) {
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** Download the month's payments as CSV (UTF-8 with BOM so Excel shows Thai correctly). */
function exportMonthCsv(month: string, rows: Payment[]) {
  const header = [
    "วันที่จ่าย",
    "ผู้รับจ้าง",
    "พร้อมเพย์",
    "งาน",
    "ค่าตอบแทนรวม (บาท)",
    "หักภาษี ณ ที่จ่าย (บาท)",
    "ยอดโอน (บาท)",
    "ผู้จ่าย",
    "ผู้รับจ้างยืนยันรับเงิน",
    "หมายเหตุ",
  ];
  const lines = rows.map((p) =>
    [
      p.paid_at ? p.paid_at.toDate().toLocaleString("th-TH") : "",
      p.employee_name,
      formatPromptPayId(p.promptpay_id),
      p.task_codes.map((c, i) => `${c} ${p.task_titles[i] ?? ""}`).join(" / "),
      p.amount.toFixed(2),
      whtOf(p).toFixed(2),
      netOf(p).toFixed(2),
      p.paid_by_name,
      p.confirmed_at ? "ยืนยันแล้ว" : "ยังไม่ยืนยัน",
      p.note,
    ]
      .map(csvCell)
      .join(","),
  );
  const csv = "﻿" + [header.map(csvCell).join(","), ...lines].join("\r\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = `clean-dee-payments-${month}.csv`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function MonthlySummary({ payments }: { payments: Payment[] }) {
  const months = useMemo(() => {
    const set = new Set(payments.map(monthKeyOf).filter(Boolean));
    set.add(currentMonthKey());
    return [...set].sort().reverse();
  }, [payments]);
  const [month, setMonth] = useState(currentMonthKey());

  const rows = payments.filter((p) => monthKeyOf(p) === month);
  const byPerson = useMemo(() => {
    const m = new Map<string, { name: string; count: number; tasks: number; gross: number; wht: number; net: number }>();
    for (const p of rows) {
      const r = m.get(p.employee_id) ?? { name: p.employee_name, count: 0, tasks: 0, gross: 0, wht: 0, net: 0 };
      r.count += 1;
      r.tasks += p.task_ids.length;
      r.gross += p.amount;
      r.wht += whtOf(p);
      r.net += netOf(p);
      m.set(p.employee_id, r);
    }
    return [...m.values()].sort((a, b) => b.gross - a.gross);
  }, [rows]);
  const total = byPerson.reduce(
    (t, r) => ({ tasks: t.tasks + r.tasks, gross: t.gross + r.gross, wht: t.wht + r.wht, net: t.net + r.net }),
    { tasks: 0, gross: 0, wht: 0, net: 0 },
  );

  return (
    <>
      <SectionTitle
        icon={CalendarRange}
        title="สรุปรายเดือน"
        hint="ใช้ส่งให้สำนักงานบัญชี"
        aside={
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="rounded-md border border-gray-200 bg-white px-3 py-2 text-sm"
              aria-label="เลือกเดือน"
            >
              {months.map((m) => (
                <option key={m} value={m}>
                  {monthLabel(m)}
                </option>
              ))}
            </select>
            <Button variant="outline" className="min-h-9 px-3 py-1.5" disabled={rows.length === 0} onClick={() => exportMonthCsv(month, rows)}>
              <Download className="h-4 w-4" /> ส่งออก Excel
            </Button>
          </div>
        }
      />
      {byPerson.length === 0 ? (
        <EmptyState>ไม่มีการจ่ายใน{monthLabel(month)}</EmptyState>
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-sm">
            <thead className="border-b border-gray-100 text-xs text-gray-400">
              <tr>
                <th className="px-5 py-3 text-left font-medium">ผู้รับจ้าง</th>
                <th className="px-3 py-3 text-right font-medium">จำนวนงาน</th>
                <th className="px-3 py-3 text-right font-medium">ค่าตอบแทนรวม</th>
                <th className="px-3 py-3 text-right font-medium">หักภาษี</th>
                <th className="px-5 py-3 text-right font-medium">ยอดโอน</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {byPerson.map((r) => (
                <tr key={r.name}>
                  <td className="px-5 py-3 text-gray-900">{r.name}</td>
                  <td className="px-3 py-3 text-right text-gray-600">{r.tasks}</td>
                  <td className="px-3 py-3 text-right text-gray-600">{formatBaht(r.gross)}</td>
                  <td className="px-3 py-3 text-right text-gray-600">{r.wht ? formatBaht(r.wht) : "-"}</td>
                  <td className="px-5 py-3 text-right font-medium text-gray-900">{formatBaht(r.net)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot className="border-t border-gray-200 bg-gray-50 font-semibold text-gray-900">
              <tr>
                <td className="px-5 py-3">รวม{monthLabel(month)}</td>
                <td className="px-3 py-3 text-right">{total.tasks}</td>
                <td className="px-3 py-3 text-right">{formatBaht(total.gross)}</td>
                <td className="px-3 py-3 text-right">{total.wht ? formatBaht(total.wht) : "-"}</td>
                <td className="px-5 py-3 text-right">{formatBaht(total.net)}</td>
              </tr>
            </tfoot>
          </table>
        </Card>
      )}
    </>
  );
}

/* ====================================================================== */
/*  Freelancer (employee role)                                            */
/* ====================================================================== */

function EmployeePayments({ me, tasks, payments }: { me: AppUser; tasks: Task[]; payments: Payment[] }) {
  const mineUnpaid = tasks.filter((t) => t.assigned_user === me.id && isUnpaid(t));
  const receivedMonth = payments.filter((p) => monthKeyOf(p) === currentMonthKey()).reduce((s, p) => s + netOf(p), 0);
  const receivedAll = payments.reduce((s, p) => s + netOf(p), 0);

  return (
    <>
      <PageHero eyebrow="การเงิน" title="ค่าตอบแทนของฉัน" subtitle="ค่าตอบแทนจะเข้าหลังงานได้รับการอนุมัติและผู้ดูแลโอนให้">
        <div className="flex flex-wrap gap-3">
          <HeroStat label="รอรับ" value={formatBaht(sum(mineUnpaid))} />
          <HeroStat label="ได้รับเดือนนี้" value={formatBaht(receivedMonth)} />
          <HeroStat label="ได้รับทั้งหมด" value={formatBaht(receivedAll)} />
        </div>
      </PageHero>

      {!me.promptpay_id && (
        <div className="mb-6">
          <Alert kind="warning">
            คุณยังไม่ได้ตั้งพร้อมเพย์ ผู้ดูแลจะสร้าง QR โอนค่าตอบแทนให้ไม่ได้ —{" "}
            <Link href="/account" className="font-medium underline">
              ตั้งค่าที่หน้าบัญชี
            </Link>
          </Alert>
        </div>
      )}

      <section>
        <SectionTitle icon={Wallet} title="รอรับเงิน" />
        {mineUnpaid.length === 0 ? (
          <EmptyState>ไม่มีค่าตอบแทนค้างรับ</EmptyState>
        ) : (
          <Card className="divide-y divide-gray-100">
            {mineUnpaid.map((t) => (
              <Link key={t.id} href={`/tasks/${t.id}`} className="flex items-center gap-3 px-5 py-3.5 hover:bg-gray-50">
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-gray-900">{t.title}</span>
                  <span className="block text-xs text-gray-400">{t.code} · อนุมัติแล้ว รอโอน</span>
                </span>
                <span className="font-semibold text-gray-900">{formatBaht(t.price ?? 0)}</span>
              </Link>
            ))}
          </Card>
        )}
      </section>

      <section className="mt-10">
        <SectionTitle icon={History} title="ประวัติการรับเงิน" hint={`${payments.length} รายการ`} />
        <PaymentHistory payments={payments} viewer={me} />
      </section>
    </>
  );
}

/* ====================================================================== */
/*  Shared history list                                                   */
/* ====================================================================== */

function PaymentHistory({ payments, viewer }: { payments: Payment[]; viewer: AppUser }) {
  const toast = useToast();
  const [slipOf, setSlipOf] = useState<Payment | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const isEmployer = viewer.role === "employer";

  if (payments.length === 0) return <EmptyState>ยังไม่มีประวัติ</EmptyState>;

  const confirm = async (p: Payment) => {
    setBusy(p.id);
    try {
      await confirmPaymentReceived(p.id);
      toast.success("ยืนยันการรับเงินแล้ว ขอบคุณครับ");
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setBusy(null);
    }
  };

  return (
    <>
      <div className="space-y-3">
        {payments.map((p) => (
          <Card key={p.id} className="p-4 sm:p-5">
            <div className="flex flex-wrap items-start gap-3">
              {isEmployer ? (
                <Avatar name={p.employee_name} className="h-10 w-10 text-sm" />
              ) : (
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                  <Receipt className="h-5 w-5" />
                </span>
              )}
              <div className="min-w-0 flex-1">
                <p className="font-medium text-gray-900">
                  {isEmployer ? p.employee_name : `จาก ${p.paid_by_name}`}
                  <span className="font-normal text-gray-400"> · {fmtTs(p.paid_at)}</span>
                </p>
                <p className="mt-0.5 text-sm text-gray-500">
                  {p.task_codes.map((c, i) => `${c} ${p.task_titles[i] ?? ""}`).join(", ")}
                </p>
                {p.note && <p className="mt-1 text-sm text-gray-600">“{p.note}”</p>}
              </div>
              <div className="text-right">
                <p className="text-lg font-semibold text-gray-900">{formatBaht(netOf(p))}</p>
                {whtOf(p) > 0 && (
                  <p className="text-xs text-gray-500">
                    เต็ม {formatBaht(p.amount)} · หักภาษี {formatBaht(whtOf(p))}
                  </p>
                )}
                <span
                  className={cn(
                    "mt-1 inline-block rounded-full px-2.5 py-0.5 text-xs font-medium",
                    p.confirmed_at ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-500",
                  )}
                >
                  {p.confirmed_at ? "ยืนยันรับเงินแล้ว" : "รอผู้รับจ้างยืนยัน"}
                </span>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {p.slip ? (
                <Button variant="ghost" className="min-h-9 px-3 py-1.5" onClick={() => setSlipOf(p)}>
                  <Receipt className="h-4 w-4" /> ดูสลิป
                </Button>
              ) : (
                <span className="px-1 py-1.5 text-xs text-gray-400">ไม่มีสลิป</span>
              )}
              {!isEmployer && !p.confirmed_at && (
                <Button className="min-h-9 px-3 py-1.5" loading={busy === p.id} onClick={() => void confirm(p)}>
                  <CheckCircle2 className="h-4 w-4" /> ได้รับเงินแล้ว
                </Button>
              )}
            </div>
          </Card>
        ))}
      </div>

      {slipOf && (
        <Modal open onClose={() => setSlipOf(null)} title={`สลิป ${formatBaht(netOf(slipOf))}`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={slipOf.slip} alt="สลิปการโอน" className="mx-auto max-h-[70vh] rounded-lg" />
          <a href={slipOf.slip} download={`slip-${slipOf.id}.jpg`} className="mt-3 inline-block text-sm font-medium text-brand-700 underline">
            ดาวน์โหลดสลิป
          </a>
        </Modal>
      )}
    </>
  );
}
