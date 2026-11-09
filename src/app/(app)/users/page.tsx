"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Pencil, UserPlus } from "lucide-react";
import { useProfile } from "@/lib/auth-context";
import { createUserAccount, subscribeUsers, updateUser } from "@/lib/api";
import { USERNAME_PATTERN } from "@/lib/firebase";
import { errMsg, fmtTs } from "@/lib/format";
import type { AppUser, Role, UserStatus } from "@/lib/types";
import { RequireEmployer } from "@/components/RequireEmployer";
import { useToast } from "@/components/toast";
import { Alert, Button, Card, EmptyState, Field, Input, Modal, PageHeader, Select, Spinner, cn } from "@/components/ui";

export default function UsersPage() {
  return (
    <RequireEmployer>
      <Users />
    </RequireEmployer>
  );
}

const NEW_USER = { username: "", name: "", phone: "", password: "", role: "employee" as Role };

function Users() {
  const me = useProfile();
  const toast = useToast();
  const [users, setUsers] = useState<AppUser[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState(NEW_USER);
  const [formError, setFormError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<AppUser | null>(null);

  useEffect(() => subscribeUsers(setUsers, (e) => setError(errMsg(e))), []);

  const set =
    (k: keyof typeof NEW_USER) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm((f) => ({ ...f, [k]: e.target.value }));

  const onCreate = async (e: FormEvent) => {
    e.preventDefault();
    setFormError(null);
    const username = form.username.trim().toLowerCase();
    if (!USERNAME_PATTERN.test(username)) return setFormError("ชื่อผู้ใช้ต้องเป็น a-z, 0-9, . _ - ยาว 3–30 ตัว");
    if (form.password.length < 6) return setFormError("รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร");
    setCreating(true);
    try {
      await createUserAccount({ ...form, username });
      toast.success(`เพิ่มผู้ใช้ ${form.name} แล้ว`);
      setForm(NEW_USER);
    } catch (err) {
      setFormError(errMsg(err));
    } finally {
      setCreating(false);
    }
  };

  return (
    <>
      <PageHeader title="จัดการบุคคล" subtitle="เพิ่ม แก้ไข ปิดการใช้งาน และกำหนดสิทธิ์ผู้ใช้" />

      <Card className="p-4 sm:p-5">
        <h2 className="mb-4 flex items-center gap-2 font-semibold text-gray-900">
          <UserPlus className="h-5 w-5 text-brand-600" /> เพิ่มผู้ใช้ใหม่
        </h2>
        <form onSubmit={onCreate} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {formError && (
            <div className="sm:col-span-2 lg:col-span-3">
              <Alert kind="error">{formError}</Alert>
            </div>
          )}
          <Field label="ชื่อผู้ใช้ (Username)" hint="ใช้สำหรับเข้าสู่ระบบ a-z, 0-9, . _ -" required>
            <Input value={form.username} onChange={set("username")} autoCapitalize="none" required />
          </Field>
          <Field label="ชื่อ-นามสกุล" required>
            <Input value={form.name} onChange={set("name")} required />
          </Field>
          <Field label="เบอร์โทรศัพท์">
            <Input type="tel" value={form.phone} onChange={set("phone")} />
          </Field>
          <Field label="รหัสผ่านเริ่มต้น" hint="อย่างน้อย 6 ตัวอักษร ผู้ใช้เปลี่ยนเองได้ภายหลัง" required>
            <Input type="text" value={form.password} onChange={set("password")} autoComplete="off" required />
          </Field>
          <Field label="สิทธิ์ (Role)" required>
            <Select value={form.role} onChange={set("role")}>
              <option value="employee">Employee (ลูกจ้าง)</option>
              <option value="employer">Employer (นายจ้าง / Admin)</option>
            </Select>
          </Field>
          <div className="flex items-end">
            <Button type="submit" loading={creating} className="w-full">
              <UserPlus className="h-4 w-4" /> เพิ่มผู้ใช้
            </Button>
          </div>
        </form>
      </Card>

      <h2 className="mb-3 mt-8 text-lg font-semibold text-gray-900">
        ผู้ใช้ทั้งหมด {users && <span className="font-normal text-gray-400">({users.length})</span>}
      </h2>
      {error && <Alert kind="error">{error}</Alert>}
      {!users ? (
        <Spinner />
      ) : users.length === 0 ? (
        <EmptyState>ยังไม่มีผู้ใช้</EmptyState>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {users.map((u) => (
            <Card key={u.id} className={cn("flex items-center gap-3 p-4", u.status === "inactive" && "bg-gray-50")}>
              <div
                className={cn(
                  "flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-lg font-semibold",
                  u.status === "active" ? "bg-brand-50 text-brand-700" : "bg-gray-200 text-gray-500",
                )}
              >
                {u.name.charAt(0) || "?"}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="truncate font-medium text-gray-900">{u.name}</span>
                  {u.id === me.id && <span className="text-xs text-gray-400">(คุณ)</span>}
                </div>
                <div className="truncate text-sm text-gray-500">
                  @{u.username}
                  {u.phone ? ` · ${u.phone}` : ""}
                </div>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-xs font-medium",
                      u.role === "employer" ? "bg-brand-600 text-white" : "bg-gray-100 text-gray-700",
                    )}
                  >
                    {u.role === "employer" ? "Employer" : "Employee"}
                  </span>
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-xs font-medium",
                      u.status === "active" ? "bg-green-50 text-green-700" : "bg-gray-200 text-gray-600",
                    )}
                  >
                    {u.status === "active" ? "ใช้งาน" : "ปิดการใช้งาน"}
                  </span>
                  <span className="text-xs text-gray-400">สร้างเมื่อ {fmtTs(u.created_at)}</span>
                </div>
              </div>
              <Button variant="ghost" onClick={() => setEditing(u)} aria-label={`แก้ไข ${u.name}`}>
                <Pencil className="h-4 w-4" />
                <span className="hidden sm:inline">แก้ไข</span>
              </Button>
            </Card>
          ))}
        </div>
      )}

      {editing && <EditUserModal user={editing} isSelf={editing.id === me.id} onClose={() => setEditing(null)} />}
    </>
  );
}

function EditUserModal({ user, isSelf, onClose }: { user: AppUser; isSelf: boolean; onClose: () => void }) {
  const toast = useToast();
  const [form, setForm] = useState({
    name: user.name,
    phone: user.phone ?? "",
    role: user.role,
    status: user.status,
  });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const onSave = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      // Employers can't demote or disable themselves (avoids locking everyone out).
      await updateUser(user.id, isSelf ? { name: form.name.trim(), phone: form.phone.trim() } : {
        name: form.name.trim(),
        phone: form.phone.trim(),
        role: form.role,
        status: form.status,
      });
      toast.success("บันทึกข้อมูลผู้ใช้แล้ว");
      onClose();
    } catch (err) {
      setError(errMsg(err));
      setSaving(false);
    }
  };

  return (
    <Modal open onClose={onClose} title={`แก้ไขผู้ใช้ @${user.username}`}>
      <form onSubmit={onSave} className="space-y-4">
        {error && <Alert kind="error">{error}</Alert>}
        <Field label="ชื่อ-นามสกุล" required>
          <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
        </Field>
        <Field label="เบอร์โทรศัพท์">
          <Input type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        </Field>
        <Field label="สิทธิ์ (Role)" hint={isSelf ? "ไม่สามารถเปลี่ยนสิทธิ์ของตัวเองได้" : undefined}>
          <Select value={form.role} disabled={isSelf} onChange={(e) => setForm({ ...form, role: e.target.value as Role })}>
            <option value="employee">Employee (ลูกจ้าง)</option>
            <option value="employer">Employer (นายจ้าง / Admin)</option>
          </Select>
        </Field>
        <Field label="สถานะบัญชี" hint={isSelf ? "ไม่สามารถปิดการใช้งานบัญชีของตัวเองได้" : "ผู้ใช้ที่ถูกปิดจะเข้าสู่ระบบไม่ได้"}>
          <Select
            value={form.status}
            disabled={isSelf}
            onChange={(e) => setForm({ ...form, status: e.target.value as UserStatus })}
          >
            <option value="active">ใช้งาน (Active)</option>
            <option value="inactive">ปิดการใช้งาน (Inactive)</option>
          </Select>
        </Field>
        <p className="text-xs text-gray-500">
          การรีเซ็ตรหัสผ่านของผู้อื่นทำได้ที่ Firebase Console › Authentication (ผู้ใช้เปลี่ยนรหัสผ่านเองได้ที่หน้า “บัญชี”)
        </p>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            ยกเลิก
          </Button>
          <Button type="submit" loading={saving}>
            บันทึก
          </Button>
        </div>
      </form>
    </Modal>
  );
}
