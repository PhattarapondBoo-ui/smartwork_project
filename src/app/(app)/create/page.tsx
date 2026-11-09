"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Plus } from "lucide-react";
import { useProfile } from "@/lib/auth-context";
import { createTask, subscribeAllTasks, subscribeUsers } from "@/lib/api";
import { errMsg, fmtDate } from "@/lib/format";
import { assigneeLabel, displayStatus, todayISO } from "@/lib/status";
import type { AppUser, Task } from "@/lib/types";
import { RequireEmployer } from "@/components/RequireEmployer";
import { StatusBadge } from "@/components/StatusBadge";
import { useToast } from "@/components/toast";
import { Alert, Button, Card, EmptyState, Field, Input, PageHeader, Select, Spinner, Textarea } from "@/components/ui";

const EMPTY = { title: "", description: "", location: "", due_date: "", assignee: "all" };

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

  useEffect(() => subscribeUsers(setUsers, (e) => setError(errMsg(e))), []);
  useEffect(() => subscribeAllTasks(setTasks, (e) => setError(errMsg(e))), []);

  const activeUsers = useMemo(
    () => users.filter((u) => u.status === "active").sort((a, b) => a.name.localeCompare(b.name, "th")),
    [users],
  );

  const set =
    (k: keyof typeof EMPTY) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setForm((f) => ({ ...f, [k]: e.target.value }));

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    const assignee = form.assignee === "all" ? null : activeUsers.find((u) => u.id === form.assignee) ?? null;
    if (form.assignee !== "all" && !assignee) return setError("กรุณาเลือกผู้รับผิดชอบ");
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

  return (
    <>
      <PageHeader title="เพิ่มรายการงาน" subtitle="สร้างงานใหม่และมอบหมายผู้รับผิดชอบ" />

      <Card className="p-4 sm:p-5">
        <form onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2">
          {error && (
            <div className="sm:col-span-2">
              <Alert kind="error">{error}</Alert>
            </div>
          )}
          <div className="sm:col-span-2">
            <Field label="ชื่องาน" required>
              <Input value={form.title} onChange={set("title")} maxLength={150} required />
            </Field>
          </div>
          <div className="sm:col-span-2">
            <Field label="รายละเอียดงาน">
              <Textarea value={form.description} onChange={set("description")} maxLength={3000} />
            </Field>
          </div>
          <Field label="บริเวณ/พื้นที่ปฏิบัติงาน" required>
            <Input value={form.location} onChange={set("location")} maxLength={200} required />
          </Field>
          <Field label="วันที่ครบกำหนด" required>
            <Input type="date" value={form.due_date} min={todayISO()} onChange={set("due_date")} required />
          </Field>
          <div className="sm:col-span-2">
            <Field
              label="ผู้รับผิดชอบ"
              hint={
                form.assignee === "all"
                  ? "ทุกคนมองเห็นงานนี้ แต่รับงานได้เพียง 1 คน (คนแรกที่กดรับงาน)"
                  : "เฉพาะผู้ใช้ที่เลือกเท่านั้นที่เห็นและรับงานนี้ได้"
              }
              required
            >
              <Select value={form.assignee} onChange={set("assignee")}>
                <option value="all">ทุกคน (All Users)</option>
                <optgroup label="รายบุคคล">
                  {activeUsers.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} (@{u.username}){u.role === "employer" ? " · Employer" : ""}
                    </option>
                  ))}
                </optgroup>
              </Select>
            </Field>
          </div>
          <div className="sm:col-span-2">
            <Button type="submit" loading={submitting} className="w-full sm:w-auto">
              <Plus className="h-4 w-4" /> เพิ่มงาน
            </Button>
          </div>
        </form>
      </Card>

      <h2 className="mb-3 mt-8 text-lg font-semibold text-gray-900">
        รายการงานทั้งหมดที่เคยสร้าง {tasks && <span className="font-normal text-gray-400">({tasks.length})</span>}
      </h2>
      {!tasks ? (
        <Spinner />
      ) : tasks.length === 0 ? (
        <EmptyState>ยังไม่มีงาน</EmptyState>
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="bg-brand-600 text-white">
              <tr>
                <th className="px-4 py-3 font-medium">รหัส</th>
                <th className="px-4 py-3 font-medium">ชื่องาน</th>
                <th className="px-4 py-3 font-medium">พื้นที่</th>
                <th className="px-4 py-3 font-medium">ผู้รับผิดชอบ</th>
                <th className="px-4 py-3 font-medium">ครบกำหนด</th>
                <th className="px-4 py-3 font-medium">สถานะ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {tasks.map((t) => (
                <tr key={t.id} className="hover:bg-brand-50/50">
                  <td className="whitespace-nowrap px-4 py-3 font-medium text-gray-500">{t.code}</td>
                  <td className="px-4 py-3">
                    <Link href={`/tasks/${t.id}`} className="font-medium text-gray-900 hover:text-brand-700">
                      {t.title}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{t.location}</td>
                  <td className="px-4 py-3 text-gray-600">{assigneeLabel(t)}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-gray-600">{fmtDate(t.due_date)}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={displayStatus(t)} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </>
  );
}
