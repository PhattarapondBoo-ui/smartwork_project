"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Phone, Search, ShieldCheck, UserPlus, UserRound } from "lucide-react";
import { useProfile } from "@/lib/auth-context";
import { createUserAccount, subscribeUsers, updateUser } from "@/lib/api";
import { USERNAME_PATTERN } from "@/lib/firebase";
import { errMsg, fmtTs } from "@/lib/format";
import type { AppUser, Role, UserStatus } from "@/lib/types";
import { Avatar } from "@/components/AppShell";
import { RequireEmployer } from "@/components/RequireEmployer";
import { useToast } from "@/components/toast";
import { Alert, Button, EmptyState, Field, Input, Modal, PageHero, PasswordInput, Spinner, cn } from "@/components/ui";

export default function UsersPage() {
  return (
    <RequireEmployer>
      <Users />
    </RequireEmployer>
  );
}

type Filter = "all" | "employee" | "employer" | "inactive";

const FILTERS: { key: Filter; label: string }[] = [
  { key: "all", label: "ทั้งหมด" },
  { key: "employee", label: "ผู้รับจ้าง" },
  { key: "employer", label: "ผู้ดูแล" },
  { key: "inactive", label: "ปิดการใช้งาน" },
];

function matches(u: AppUser, f: Filter) {
  if (f === "all") return true;
  if (f === "inactive") return u.status === "inactive";
  return u.status === "active" && u.role === f;
}

function Users() {
  const me = useProfile();
  const [users, setUsers] = useState<AppUser[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<AppUser | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");

  useEffect(() => subscribeUsers(setUsers, (e) => setError(errMsg(e))), []);

  const counts = useMemo(
    () => Object.fromEntries(FILTERS.map((f) => [f.key, (users ?? []).filter((u) => matches(u, f.key)).length])) as Record<Filter, number>,
    [users],
  );

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (users ?? []).filter(
      (u) => matches(u, filter) && (!q || [u.name, u.username, u.phone ?? ""].some((s) => s.toLowerCase().includes(q))),
    );
  }, [users, filter, search]);

  return (
    <>
      <PageHero
        eyebrow="ทีมของคุณ"
        title="จัดการบุคคล"
        subtitle="เพิ่มผู้รับจ้าง กำหนดสิทธิ์ และปิดการใช้งานบัญชีที่ไม่ใช้แล้ว"
        action={
          <Button onClick={() => setAdding(true)}>
            <UserPlus className="h-4 w-4" /> เพิ่มผู้ใช้
          </Button>
        }
      >
        <div className="flex flex-wrap gap-3">
          <Stat label="ผู้รับจ้าง" value={counts.employee} />
          <Stat label="ผู้ดูแล" value={counts.employer} />
          <Stat label="ปิดการใช้งาน" value={counts.inactive} muted />
        </div>
      </PageHero>

      <div className="relative">
        <Search className="pointer-events-none absolute left-4 top-1/2 z-10 h-[18px] w-[18px] -translate-y-1/2 text-gray-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="ค้นหาชื่อ ชื่อผู้ใช้ หรือเบอร์โทร"
          className="glass w-full rounded-md py-3.5 pl-11 pr-4 text-base shadow-[0_10px_30px_-16px_rgba(16,42,67,0.10)] ring-1 ring-gray-200/80 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-200 sm:text-sm"
        />
      </div>

      <nav className="no-scrollbar -mx-4 mt-4 flex gap-2 overflow-x-auto px-4 pb-1">
        {FILTERS.map((f) => {
          const active = filter === f.key;
          return (
            <button
              key={f.key}
              type="button"
              onClick={() => setFilter(f.key)}
              className={cn(
                "flex shrink-0 items-center gap-2 rounded-md py-2 pl-4 pr-2 text-sm font-medium transition",
                active
                  ? "bg-brand-600 text-white shadow-sm"
                  : "glass text-gray-600 shadow-sm ring-1 ring-inset ring-gray-200 hover:text-gray-900",
              )}
            >
              {f.label}
              <span
                className={cn(
                  "min-w-6 rounded-full px-1.5 py-0.5 text-center text-xs font-semibold",
                  active ? "bg-white/20 text-white" : "bg-gray-100 text-gray-500",
                )}
              >
                {counts[f.key]}
              </span>
            </button>
          );
        })}
      </nav>

      <div className="mt-5">
        {error && <Alert kind="error">{error}</Alert>}
        {!users ? (
          <Spinner />
        ) : visible.length === 0 ? (
          <EmptyState>ไม่พบผู้ใช้</EmptyState>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {visible.map((u) => (
              <PersonCard key={u.id} user={u} isSelf={u.id === me.id} onEdit={() => setEditing(u)} />
            ))}
          </div>
        )}
      </div>

      {adding && <AddUserModal onClose={() => setAdding(false)} />}
      {editing && <EditUserModal user={editing} isSelf={editing.id === me.id} onClose={() => setEditing(null)} />}
    </>
  );
}

function Stat({ label, value, muted }: { label: string; value: number; muted?: boolean }) {
  return (
    <div className="min-w-[7rem] rounded-lg bg-white/10 px-4 py-3 ring-1 ring-white/20">
      <div className={cn("text-2xl font-semibold", muted ? "text-white/60" : "text-white")}>{value}</div>
      <div className="text-xs font-light text-brand-100">{label}</div>
    </div>
  );
}

function PersonCard({ user: u, isSelf, onEdit }: { user: AppUser; isSelf: boolean; onEdit: () => void }) {
  const inactive = u.status === "inactive";
  return (
    <button
      type="button"
      onClick={onEdit}
      className={cn(
        "glass group flex flex-col items-center rounded-xl p-6 text-center ring-1 ring-gray-200/80 transition duration-300",
        "shadow-[0_1px_1px_rgba(255,255,255,0.8)_inset,0_16px_40px_-20px_rgba(16,42,67,0.10)] hover:-translate-y-1",
        inactive && "opacity-60",
      )}
    >
      <div className="relative">
        <Avatar name={u.name} className="h-16 w-16 text-2xl" />
        <span
          className={cn(
            "absolute bottom-0.5 right-0.5 h-3.5 w-3.5 rounded-full ring-2 ring-white",
            inactive ? "bg-gray-300" : "bg-emerald-400",
          )}
          title={inactive ? "ปิดการใช้งาน" : "ใช้งานอยู่"}
        />
      </div>
      <p className="mt-3 max-w-full truncate font-medium text-gray-900">
        {u.name}
        {isSelf && <span className="font-normal text-gray-400"> (คุณ)</span>}
      </p>
      <p className="max-w-full truncate text-sm text-gray-500">@{u.username}</p>
      <div className="mt-3 flex flex-wrap justify-center gap-1.5">
        <span
          className={cn(
            "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium",
            u.role === "employer" ? "bg-brand-50 text-brand-700" : "bg-gray-100 text-gray-600",
          )}
        >
          {u.role === "employer" ? <ShieldCheck className="h-3.5 w-3.5" /> : <UserRound className="h-3.5 w-3.5" />}
          {u.role === "employer" ? "ผู้ดูแล" : "ผู้รับจ้าง"}
        </span>
        {u.phone && (
          <span className="inline-flex items-center gap-1 rounded-full bg-white/80 px-2.5 py-1 text-xs text-gray-600 ring-1 ring-gray-100">
            <Phone className="h-3 w-3" />
            {u.phone}
          </span>
        )}
      </div>
      <p className="mt-4 text-[11px] text-gray-400">เข้าร่วมเมื่อ {fmtTs(u.created_at)}</p>
      <span className="mt-3 text-sm font-medium text-brand-700 opacity-0 transition group-hover:opacity-100">แก้ไขข้อมูล</span>
    </button>
  );
}

function RolePicker({ value, onChange, disabled }: { value: Role; onChange: (r: Role) => void; disabled?: boolean }) {
  const options: { key: Role; title: string; text: string; icon: typeof UserRound }[] = [
    { key: "employee", title: "ผู้รับจ้าง", text: "รับงานและส่งงาน", icon: UserRound },
    { key: "employer", title: "ผู้ดูแล", text: "สร้างและตรวจงาน", icon: ShieldCheck },
  ];
  return (
    <div className="grid grid-cols-2 gap-2">
      {options.map((o) => {
        const active = value === o.key;
        return (
          <button
            key={o.key}
            type="button"
            disabled={disabled}
            onClick={() => onChange(o.key)}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3.5 py-3 text-left transition disabled:cursor-not-allowed disabled:opacity-50",
              active ? "bg-accent-50 ring-1 ring-accent-700" : "bg-gray-50 ring-1 ring-gray-200 hover:ring-accent-700/50",
            )}
          >
            <span className={cn("flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2", active ? "border-accent-700" : "border-accent-700/40")}>
              {active && <span className="h-2.5 w-2.5 rounded-full bg-accent-700" />}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-medium text-gray-900">{o.title}</span>
              <span className="block text-xs text-gray-500">{o.text}</span>
            </span>
            <o.icon className="h-5 w-5 shrink-0 text-gray-500" />
          </button>
        );
      })}
    </div>
  );
}

const NEW_USER = { username: "", name: "", phone: "", password: "", role: "employee" as Role };

function AddUserModal({ onClose }: { onClose: () => void }) {
  const toast = useToast();
  const [form, setForm] = useState(NEW_USER);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const set = (k: "username" | "name" | "phone" | "password") => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const onCreate = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    const username = form.username.trim().toLowerCase();
    if (!USERNAME_PATTERN.test(username)) return setError("ชื่อผู้ใช้ต้องเป็น a-z, 0-9, . _ - ยาว 3–30 ตัว");
    if (form.password.length < 6) return setError("รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร");
    setSaving(true);
    try {
      await createUserAccount({ ...form, username });
      toast.success(`เพิ่มผู้ใช้ ${form.name} แล้ว`);
      onClose();
    } catch (err) {
      setError(errMsg(err));
      setSaving(false);
    }
  };

  return (
    <Modal open onClose={onClose} title="เพิ่มผู้ใช้ใหม่">
      <form onSubmit={onCreate} className="space-y-4">
        {error && <Alert kind="error">{error}</Alert>}
        <Field label="ชื่อ-นามสกุล" required>
          <Input value={form.name} onChange={set("name")} required />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="ชื่อผู้ใช้ (สำหรับเข้าสู่ระบบ)" hint="a-z, 0-9, . _ -" required>
            <Input value={form.username} onChange={set("username")} autoCapitalize="none" required />
          </Field>
          <Field label="เบอร์โทรศัพท์">
            <Input type="tel" value={form.phone} onChange={set("phone")} />
          </Field>
        </div>
        <Field label="รหัสผ่านเริ่มต้น" hint="อย่างน้อย 6 ตัวอักษร ผู้ใช้เปลี่ยนเองได้ภายหลัง" required>
          <PasswordInput value={form.password} onChange={set("password")} autoComplete="new-password" required />
        </Field>
        <Field label="สิทธิ์">
          <RolePicker value={form.role} onChange={(role) => setForm((f) => ({ ...f, role }))} />
        </Field>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={onClose}>
            ยกเลิก
          </Button>
          <Button type="submit" loading={saving}>
            <UserPlus className="h-4 w-4" /> เพิ่มผู้ใช้
          </Button>
        </div>
      </form>
    </Modal>
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
      await updateUser(
        user.id,
        isSelf
          ? { name: form.name.trim(), phone: form.phone.trim() }
          : { name: form.name.trim(), phone: form.phone.trim(), role: form.role, status: form.status },
      );
      toast.success("บันทึกข้อมูลผู้ใช้แล้ว");
      onClose();
    } catch (err) {
      setError(errMsg(err));
      setSaving(false);
    }
  };

  const setStatus = (status: UserStatus) => setForm((f) => ({ ...f, status }));

  return (
    <Modal open onClose={onClose} title="แก้ไขผู้ใช้">
      <div className="mb-5 flex items-center gap-3 rounded-lg bg-brand-50 p-3">
        <Avatar name={user.name} className="h-12 w-12 text-lg" />
        <div className="min-w-0">
          <p className="truncate font-medium text-gray-900">{user.name}</p>
          <p className="truncate text-sm text-gray-500">@{user.username}</p>
        </div>
      </div>
      <form onSubmit={onSave} className="space-y-4">
        {error && <Alert kind="error">{error}</Alert>}
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="ชื่อ-นามสกุล" required>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </Field>
          <Field label="เบอร์โทรศัพท์">
            <Input type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </Field>
        </div>
        <Field label="สิทธิ์" hint={isSelf ? "ไม่สามารถเปลี่ยนสิทธิ์ของตัวเองได้" : undefined}>
          <RolePicker value={form.role} disabled={isSelf} onChange={(role) => setForm((f) => ({ ...f, role }))} />
        </Field>

        <div
          className={cn(
            "flex items-center justify-between gap-4 rounded-2xl p-4 ring-1",
            form.status === "active" ? "bg-emerald-50/60 ring-emerald-100" : "bg-gray-50 ring-gray-200",
          )}
        >
          <div>
            <p className="text-sm font-semibold text-gray-900">{form.status === "active" ? "บัญชีใช้งานอยู่" : "บัญชีถูกปิดการใช้งาน"}</p>
            <p className="text-xs text-gray-500">
              {isSelf ? "ไม่สามารถปิดการใช้งานบัญชีของตัวเองได้" : "ผู้ใช้ที่ถูกปิดจะเข้าสู่ระบบไม่ได้"}
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={form.status === "active"}
            disabled={isSelf}
            onClick={() => setStatus(form.status === "active" ? "inactive" : "active")}
            className={cn(
              "relative h-7 w-12 shrink-0 rounded-full transition disabled:cursor-not-allowed disabled:opacity-50",
              form.status === "active" ? "bg-emerald-500" : "bg-gray-300",
            )}
          >
            <span
              className={cn(
                "absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all",
                form.status === "active" ? "left-6" : "left-1",
              )}
            />
          </button>
        </div>

        <p className="text-xs leading-relaxed text-gray-400">
          รีเซ็ตรหัสผ่านของผู้อื่นได้ที่ Firebase Console › Authentication (ผู้ใช้เปลี่ยนรหัสผ่านเองได้ที่หน้า “บัญชี”)
        </p>
        <div className="flex justify-end gap-2 pt-1">
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
