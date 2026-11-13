"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { CalendarClock, ChevronRight, FileText, ListChecks, MapPin, Plus, UserRound, Users } from "lucide-react";
import { useProfile } from "@/lib/auth-context";
import { createTask, subscribeAllTasks, subscribeUsers } from "@/lib/api";
import { errMsg, fmtDate } from "@/lib/format";
import { assigneeLabel, displayStatus, todayISO } from "@/lib/status";
import type { AppUser, Task } from "@/lib/types";
import { Avatar } from "@/components/AppShell";
import { RequireEmployer } from "@/components/RequireEmployer";
import { StatusBadge } from "@/components/StatusBadge";
import { useToast } from "@/components/toast";
import { Alert, Button, Card, EmptyState, Field, Input, PageHero, SectionTitle, Spinner, Textarea, cn } from "@/components/ui";

const EMPTY = { title: "", description: "", location: "", due_date: "", mode: "all" as "all" | "user", assignee: "" };
const RECENT_LIMIT = 12;

/** YYYY-MM-DD for today + n days, in local time. */
function isoInDays(n: number) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toLocaleDateString("en-CA");
}

const QUICK_DATES = [
  { label: "วันนี้", days: 0 },
  { label: "พรุ่งนี้", days: 1 },
  { label: "อีก 3 วัน", days: 3 },
  { label: "สัปดาห์หน้า", days: 7 },
];

export default function CreateTaskPage() {
  return (
    <RequireEmployer>
      <CreateTask />
    </RequireEmployer>
  );
}

function CreateTask() {
  const me = useProfile();
  const toast = useToast();
  const [form, setForm] = useState(EMPTY);
  const [users, setUsers] = useState<AppUser[]>([]);
  const [tasks, setTasks] = useState<Task[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => subscribeUsers(setUsers, (e) => setError(errMsg(e))), []);
  useEffect(() => subscribeAllTasks(setTasks, (e) => setError(errMsg(e))), []);

  const activeUsers = useMemo(
    () => users.filter((u) => u.status === "active").sort((a, b) => a.name.localeCompare(b.name, "th")),
    [users],
  );

  const set =
    (k: "title" | "description" | "location" | "due_date") =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [k]: e.target.value }));

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    const assignee = form.mode === "user" ? activeUsers.find((u) => u.id === form.assignee) ?? null : null;
    if (form.mode === "user" && !assignee) return setError("กรุณาเลือกผู้รับผิดชอบ");
    setSubmitting(true);
    try {
      await createTask(
        {
          title: form.title,
          description: form.description,
          location: form.location,
          due_date: form.due_date,
          assigned_type: assignee ? "user" : "all",
          assigned_user: assignee,
        },
        me,
      );
      toast.success(`เพิ่มงาน "${form.title}" แล้ว`);
      setForm(EMPTY);
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setSubmitting(false);
    }
  };

  const listed = tasks ? (showAll ? tasks : tasks.slice(0, RECENT_LIMIT)) : [];

  return (
    <>
      <PageHero
        eyebrow="งานใหม่"
        title="เพิ่มรายการงาน"
        subtitle="กรอกรายละเอียด เลือกพื้นที่และวันส่ง แล้วมอบหมายให้ทุกคนหรือคนใดคนหนึ่ง"
      />

      <form onSubmit={onSubmit} className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)]">
        <div className="space-y-5">
          {error && <Alert kind="error">{error}</Alert>}

          {/* 1. What */}
          <Card className="p-5 sm:p-7">
            <SectionTitle icon={FileText} title="รายละเอียดงาน" hint="บอกให้ชัดว่าต้องทำอะไร ทีมจะทำงานได้ตรงใจ" />
            <div className="space-y-4">
              <Field label="ชื่องาน" required>
                <Input value={form.title} onChange={set("title")} maxLength={150} placeholder="เช่น ทำความสะอาดห้องประชุมชั้น 3" required />
              </Field>
              <Field label="รายละเอียด">
                <Textarea
                  value={form.description}
                  onChange={set("description")}
                  maxLength={3000}
                  placeholder="เช่น ดูดฝุ่นพรม เช็ดโต๊ะ เปลี่ยนถุงขยะ ถ่ายรูปก่อน-หลัง"
                />
              </Field>
            </div>
          </Card>

          {/* 2. Where & when */}
          <Card className="p-5 sm:p-7">
            <SectionTitle icon={MapPin} title="สถานที่และกำหนดส่ง" />
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="บริเวณ / พื้นที่ปฏิบัติงาน" required>
                <Input value={form.location} onChange={set("location")} maxLength={200} placeholder="เช่น อาคาร A ชั้น 3" required />
              </Field>
              <Field label="วันที่ครบกำหนด" required>
                <Input type="date" value={form.due_date} min={todayISO()} onChange={set("due_date")} required />
              </Field>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {QUICK_DATES.map((q) => {
                const iso = isoInDays(q.days);
                const active = form.due_date === iso;
                return (
                  <button
                    key={q.label}
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, due_date: iso }))}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-md px-3.5 py-1.5 text-xs font-medium transition",
                      active ? "bg-brand-600 text-white" : "bg-white text-gray-600 ring-1 ring-gray-200 hover:ring-brand-300",
                    )}
                  >
                    <CalendarClock className="h-3.5 w-3.5" />
                    {q.label}
                  </button>
                );
              })}
            </div>
          </Card>
        </div>

        {/* 3. Who */}
        <div className="space-y-5 lg:sticky lg:top-24 lg:self-start">
          <Card className="p-5 sm:p-7">
            <SectionTitle icon={Users} title="ผู้รับผิดชอบ" />
            <div className="grid gap-2">
              <ModeCard
                active={form.mode === "all"}
                onClick={() => setForm((f) => ({ ...f, mode: "all", assignee: "" }))}
                icon={Users}
                title="ทุกคน"
                text="คนแรกที่กดรับได้งาน"
              />
              <ModeCard
                active={form.mode === "user"}
                onClick={() => setForm((f) => ({ ...f, mode: "user" }))}
                icon={UserRound}
                title="ระบุบุคคล"
                text="มอบให้คนเดียว"
              />
            </div>

            {form.mode === "user" && (
              <div className="mt-4 max-h-72 space-y-1.5 overflow-y-auto pr-1">
                {activeUsers.length === 0 && <p className="text-sm text-gray-500">ยังไม่มีผู้ใช้ที่เปิดใช้งาน</p>}
                {activeUsers.map((u) => {
                  const selected = form.assignee === u.id;
                  return (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, assignee: u.id }))}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition",
                        selected ? "bg-accent-50 ring-1 ring-accent-700" : "hover:bg-gray-50",
                      )}
                    >
                      <Avatar name={u.name} className="h-9 w-9 text-sm" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-gray-900">{u.name}</span>
                        <span className="block truncate text-xs text-gray-500">
                          @{u.username}
                          {u.role === "employer" ? " · Employer" : ""}
                        </span>
                      </span>
                      <Radio checked={selected} />
                    </button>
                  );
                })}
              </div>
            )}

            <Button type="submit" loading={submitting} className="mt-6 w-full">
              <Plus className="h-4 w-4" /> สร้างงาน
            </Button>
          </Card>
        </div>
      </form>

      {/* Recent tasks */}
      <section className="mt-10">
        <SectionTitle
          icon={ListChecks}
          title="งานที่สร้างไว้"
          hint={tasks ? `ทั้งหมด ${tasks.length} งาน` : undefined}
        />
        {!tasks ? (
          <Spinner />
        ) : tasks.length === 0 ? (
          <EmptyState>ยังไม่มีงาน</EmptyState>
        ) : (
          <>
            {/* Desktop table */}
            <Card className="hidden overflow-hidden md:block">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-gray-100 text-xs uppercase tracking-wide text-gray-400">
                  <tr>
                    <th className="px-6 py-4 font-medium">รหัส</th>
                    <th className="px-4 py-4 font-medium">ชื่องาน</th>
                    <th className="px-4 py-4 font-medium">พื้นที่</th>
                    <th className="px-4 py-4 font-medium">ผู้รับผิดชอบ</th>
                    <th className="px-4 py-4 font-medium">ครบกำหนด</th>
                    <th className="px-6 py-4 font-medium">สถานะ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100/80">
                  {listed.map((t) => (
                    <tr key={t.id} className="transition hover:bg-brand-50/60">
                      <td className="whitespace-nowrap px-6 py-4 font-mono text-xs text-brand-700">{t.code}</td>
                      <td className="px-4 py-4">
                        <Link href={`/tasks/${t.id}`} className="font-medium text-gray-900 hover:text-brand-700">
                          {t.title}
                        </Link>
                      </td>
                      <td className="px-4 py-4 text-gray-600">{t.location}</td>
                      <td className="px-4 py-4 text-gray-600">{assigneeLabel(t)}</td>
                      <td className="whitespace-nowrap px-4 py-4 text-gray-600">{fmtDate(t.due_date)}</td>
                      <td className="px-6 py-4">
                        <StatusBadge status={displayStatus(t)} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>

            {/* Mobile list */}
            <div className="space-y-2 md:hidden">
              {listed.map((t) => (
                <Link
                  key={t.id}
                  href={`/tasks/${t.id}`}
                  className="glass flex items-center gap-3 rounded-2xl p-4 ring-1 ring-gray-200/80"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[11px] text-brand-700">{t.code}</span>
                      <StatusBadge status={displayStatus(t)} />
                    </div>
                    <p className="mt-1 truncate font-medium text-gray-900">{t.title}</p>
                    <p className="truncate text-xs text-gray-500">
                      {t.location} · {fmtDate(t.due_date)}
                    </p>
                  </div>
                  <ChevronRight className="h-5 w-5 shrink-0 text-gray-300" />
                </Link>
              ))}
            </div>

            {tasks.length > RECENT_LIMIT && (
              <div className="mt-4 text-center">
                <Button variant="ghost" onClick={() => setShowAll((s) => !s)}>
                  {showAll ? "แสดงเฉพาะล่าสุด" : `ดูทั้งหมด ${tasks.length} งาน`}
                </Button>
              </div>
            )}
          </>
        )}
      </section>
    </>
  );
}

function ModeCard({
  active,
  onClick,
  icon: Icon,
  title,
  text,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  text: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "flex items-center gap-3 rounded-lg px-4 py-3.5 text-left transition",
        active ? "bg-accent-50 ring-1 ring-accent-700" : "bg-gray-50 ring-1 ring-gray-200 hover:ring-accent-700/50",
      )}
    >
      <Radio checked={active} />
      <span className="min-w-0 flex-1">
        <span className="block text-[15px] font-medium text-gray-900">{title}</span>
        <span className="block text-xs text-gray-500">{text}</span>
      </span>
      <Icon className="h-5 w-5 shrink-0 text-gray-500" />
    </button>
  );
}

/** Copper radio dot, as used on the option cards. */
function Radio({ checked }: { checked: boolean }) {
  return (
    <span
      className={cn(
        "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2",
        checked ? "border-accent-700" : "border-accent-700/40",
      )}
    >
      {checked && <span className="h-2.5 w-2.5 rounded-full bg-accent-700" />}
    </span>
  );
}
