"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { isSetupDone, setupFirstAdmin } from "@/lib/api";
import { USERNAME_PATTERN } from "@/lib/firebase";
import { errMsg } from "@/lib/format";
import { AuthScreen } from "@/components/AuthScreen";
import { Alert, Button, Field, Input, Spinner } from "@/components/ui";

export default function SetupPage() {
  const router = useRouter();
  const [state, setState] = useState<"checking" | "ready" | "done">("checking");
  const [form, setForm] = useState({ username: "", name: "", password: "", confirm: "" });
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    isSetupDone()
      .then((done) => setState(done ? "done" : "ready"))
      .catch((e) => {
        setError(errMsg(e));
        setState("ready");
      });
  }, []);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    const username = form.username.trim().toLowerCase();
    if (!USERNAME_PATTERN.test(username)) return setError("ชื่อผู้ใช้ต้องเป็น a-z, 0-9, . _ - ยาว 3–30 ตัว");
    if (form.password.length < 6) return setError("รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร");
    if (form.password !== form.confirm) return setError("รหัสผ่านยืนยันไม่ตรงกัน");
    setSubmitting(true);
    try {
      await setupFirstAdmin({ username, name: form.name, password: form.password });
      router.replace("/tasks");
    } catch (err) {
      setError(errMsg(err));
      setSubmitting(false);
    }
  };

  if (state === "checking") return <Spinner />;

  if (state === "done") {
    return (
      <AuthScreen title="ตั้งค่าเรียบร้อยแล้ว">
        <p className="text-sm text-gray-600">ระบบมีผู้ดูแลแล้ว กรุณาเข้าสู่ระบบ</p>
        <Link href="/login" className="mt-4 block text-center font-medium text-brand-700 underline">
          ไปหน้าเข้าสู่ระบบ
        </Link>
      </AuthScreen>
    );
  }

  return (
    <AuthScreen title="ตั้งค่าระบบครั้งแรก" subtitle="สร้างบัญชี Employer (ผู้ดูแลระบบ) คนแรก">
      <form onSubmit={onSubmit} className="space-y-4">
        {error && <Alert kind="error">{error}</Alert>}
        <Field label="ชื่อผู้ใช้ (Username)" hint="a-z, 0-9, . _ -" required>
          <Input value={form.username} onChange={set("username")} autoCapitalize="none" required />
        </Field>
        <Field label="ชื่อ-นามสกุล" required>
          <Input value={form.name} onChange={set("name")} required />
        </Field>
        <Field label="รหัสผ่าน" required>
          <Input type="password" value={form.password} onChange={set("password")} autoComplete="new-password" required />
        </Field>
        <Field label="ยืนยันรหัสผ่าน" required>
          <Input type="password" value={form.confirm} onChange={set("confirm")} autoComplete="new-password" required />
        </Field>
        <Button type="submit" loading={submitting} className="w-full">
          สร้างบัญชีผู้ดูแล
        </Button>
      </form>
    </AuthScreen>
  );
}
