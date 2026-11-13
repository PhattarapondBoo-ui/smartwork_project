"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { signInWithEmailAndPassword } from "firebase/auth";
import { fb, usernameToEmail } from "@/lib/firebase";
import { isSetupDone } from "@/lib/api";
import { errMsg } from "@/lib/format";
import { useAuth } from "@/lib/auth-context";
import { AuthScreen } from "@/components/AuthScreen";
import { Alert, Button, Field, Input } from "@/components/ui";

export default function LoginPage() {
  const { profile, loading, notice } = useAuth();
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [needsSetup, setNeedsSetup] = useState(false);

  useEffect(() => {
    if (!loading && profile) router.replace("/tasks");
  }, [loading, profile, router]);

  useEffect(() => {
    isSetupDone()
      .then((done) => setNeedsSetup(!done))
      .catch(() => undefined);
  }, []);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await signInWithEmailAndPassword(fb().auth, usernameToEmail(username), password);
      // Redirect happens once the profile loads (see effect above).
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthScreen title="เข้าสู่ระบบ" subtitle="กรอกชื่อผู้ใช้และรหัสผ่านของคุณ">
      <form onSubmit={onSubmit} className="space-y-4">
        {(error || notice) && <Alert kind="error">{error ?? notice}</Alert>}
        <Field label="ชื่อผู้ใช้ (Username)">
          <Input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
            autoCapitalize="none"
            required
          />
        </Field>
        <Field label="รหัสผ่าน">
          <Input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
          />
        </Field>
        <Button type="submit" loading={submitting || (loading && !!username)} className="w-full">
          เข้าสู่ระบบ
        </Button>
        {needsSetup && (
          <Alert kind="warning">
            ระบบยังไม่มีผู้ดูแล{" "}
            <Link href="/setup" className="font-semibold underline">
              ตั้งค่าบัญชีผู้ดูแลระบบคนแรก
            </Link>
          </Alert>
        )}
        <p className="text-center text-xs text-gray-400">ลืมรหัสผ่าน? กรุณาติดต่อผู้ดูแลระบบ</p>
        <p className="text-center text-xs">
          <Link href="/privacy" className="text-gray-500 underline hover:text-brand-700">
            ประกาศความเป็นส่วนตัว
          </Link>
        </p>
      </form>
    </AuthScreen>
  );
}
