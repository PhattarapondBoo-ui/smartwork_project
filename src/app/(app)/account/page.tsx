"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { CalendarHeart, KeyRound, LogOut, Save, ShieldCheck, UserRound } from "lucide-react";
import { useAuth, useProfile } from "@/lib/auth-context";
import { changeMyPassword, updateMyProfile } from "@/lib/api";
import { errMsg, fmtTs } from "@/lib/format";
import { formatPromptPayId, validatePromptPayId } from "@/lib/promptpay";
import { Avatar } from "@/components/AppShell";
import { HeroPattern } from "@/components/Brand";
import { useToast } from "@/components/toast";
import { Alert, Button, Card, Field, Input, PasswordInput, SectionTitle, cn } from "@/components/ui";

/** 0–3: rough password strength, just to nudge people toward better passwords. */
function strength(pw: string) {
  if (!pw) return 0;
  let s = 0;
  if (pw.length >= 8) s++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) s++;
  if (/\d/.test(pw) && /[^A-Za-z0-9]/.test(pw)) s++;
  else if (/\d/.test(pw) || /[^A-Za-z0-9]/.test(pw)) s += pw.length >= 10 ? 1 : 0;
  return Math.max(1, Math.min(3, s));
}

const STRENGTH = [
  { label: "", bar: "" },
  { label: "อ่อน", bar: "bg-red-400" },
  { label: "พอใช้", bar: "bg-amber-400" },
  { label: "แข็งแรง", bar: "bg-emerald-500" },
];

export default function AccountPage() {
  const me = useProfile();
  const { logout } = useAuth();
  const toast = useToast();

  const [profile, setProfile] = useState({ name: me.name, phone: me.phone ?? "", promptpay_id: formatPromptPayId(me.promptpay_id) });
  const [profileErr, setProfileErr] = useState<string | null>(null);
  const [savingProfile, setSavingProfile] = useState(false);

  const [pw, setPw] = useState({ current: "", next: "", confirm: "" });
  const [pwErr, setPwErr] = useState<string | null>(null);
  const [savingPw, setSavingPw] = useState(false);

  const saveProfile = async (e: FormEvent) => {
    e.preventDefault();
    setProfileErr(null);
    if (!profile.name.trim()) return setProfileErr("กรุณากรอกชื่อ");
    if (profile.promptpay_id.trim()) {
      const ppErr = validatePromptPayId(profile.promptpay_id);
      if (ppErr) return setProfileErr(ppErr);
    }
    setSavingProfile(true);
    try {
      await updateMyProfile(me.id, profile);
      toast.success("บันทึกข้อมูลส่วนตัวแล้ว");
    } catch (err) {
      setProfileErr(errMsg(err));
    } finally {
      setSavingProfile(false);
    }
  };

  const savePassword = async (e: FormEvent) => {
    e.preventDefault();
    setPwErr(null);
    if (pw.next.length < 6) return setPwErr("รหัสผ่านใหม่ต้องมีอย่างน้อย 6 ตัวอักษร");
    if (pw.next !== pw.confirm) return setPwErr("รหัสผ่านยืนยันไม่ตรงกัน");
    if (pw.next === pw.current) return setPwErr("รหัสผ่านใหม่ต้องไม่ซ้ำกับรหัสผ่านเดิม");
    setSavingPw(true);
    try {
      await changeMyPassword(pw.current, pw.next);
      setPw({ current: "", next: "", confirm: "" });
      toast.success("เปลี่ยนรหัสผ่านเรียบร้อย");
    } catch (err) {
      setPwErr(errMsg(err));
    } finally {
      setSavingPw(false);
    }
  };

  const level = strength(pw.next);
  const mismatch = pw.confirm.length > 0 && pw.confirm !== pw.next;

  return (
    <div className="mx-auto max-w-4xl">
      {/* Profile hero */}
      <section className="relative mb-6 overflow-hidden rounded-xl rounded-br-[3rem] bg-brand-600 px-6 pb-8 pt-10 text-center text-white shadow-sm">
        <HeroPattern className="pointer-events-none absolute inset-0 h-full w-full opacity-70" />
        <div className="relative">
        <div className="mx-auto w-fit rounded-full bg-white/20 p-1.5">
          <Avatar name={me.name} className="h-24 w-24 text-4xl" />
        </div>
        <h1 className="mt-4 font-display text-3xl font-semibold tracking-tight">{me.name}</h1>
        <p className="text-sm font-light text-brand-100">@{me.username}</p>
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 text-xs font-medium text-white">
            {me.role === "employer" ? <ShieldCheck className="h-3.5 w-3.5" /> : <UserRound className="h-3.5 w-3.5" />}
            {me.role === "employer" ? "ผู้ดูแลระบบ" : "ผู้รับจ้าง (ฟรีแลนซ์)"}
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 text-xs text-white/90">
            <CalendarHeart className="h-3.5 w-3.5" />
            เข้าร่วมเมื่อ {fmtTs(me.created_at)}
          </span>
        </div>
        </div>
      </section>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card className="p-5 sm:p-7">
          <SectionTitle icon={UserRound} title="ข้อมูลส่วนตัว" hint="ชื่อนี้จะแสดงในงานที่คุณรับและส่ง" />
          <form onSubmit={saveProfile} className="space-y-4">
            {profileErr && <Alert kind="error">{profileErr}</Alert>}
            <Field label="ชื่อ-นามสกุล" required>
              <Input value={profile.name} onChange={(e) => setProfile({ ...profile, name: e.target.value })} required />
            </Field>
            <Field label="เบอร์โทรศัพท์">
              <Input type="tel" value={profile.phone} onChange={(e) => setProfile({ ...profile, phone: e.target.value })} />
            </Field>
            <Field
              label="พร้อมเพย์สำหรับรับค่าตอบแทน"
              hint="เบอร์มือถือ 10 หลัก หรือเลขบัตรประชาชน 13 หลัก — ผู้ดูแลจะใช้สร้าง QR โอนค่าตอบแทนให้คุณ"
            >
              <Input
                inputMode="numeric"
                value={profile.promptpay_id}
                onChange={(e) => setProfile({ ...profile, promptpay_id: e.target.value })}
                placeholder="เช่น 081-234-5678"
              />
            </Field>
            <Field label="ชื่อผู้ใช้" hint="ใช้เข้าสู่ระบบ เปลี่ยนไม่ได้">
              <Input value={me.username} disabled />
            </Field>
            <Button type="submit" loading={savingProfile}>
              <Save className="h-4 w-4" /> บันทึกข้อมูล
            </Button>
          </form>
        </Card>

        <Card className="p-5 sm:p-7">
          <SectionTitle icon={KeyRound} title="เปลี่ยนรหัสผ่าน" hint="แนะนำอย่างน้อย 8 ตัว ผสมตัวเลขและสัญลักษณ์" />
          <form onSubmit={savePassword} className="space-y-4">
            {pwErr && <Alert kind="error">{pwErr}</Alert>}
            <Field label="รหัสผ่านปัจจุบัน" required>
              <PasswordInput
                value={pw.current}
                onChange={(e) => setPw({ ...pw, current: e.target.value })}
                autoComplete="current-password"
                required
              />
            </Field>
            <Field label="รหัสผ่านใหม่" required>
              <PasswordInput
                value={pw.next}
                onChange={(e) => setPw({ ...pw, next: e.target.value })}
                autoComplete="new-password"
                required
              />
              {pw.next && (
                <div className="mt-2 flex items-center gap-3">
                  <div className="flex flex-1 gap-1">
                    {[1, 2, 3].map((i) => (
                      <span key={i} className={cn("h-1.5 flex-1 rounded-full", i <= level ? STRENGTH[level].bar : "bg-gray-200")} />
                    ))}
                  </div>
                  <span className="w-12 text-right text-xs text-gray-500">{STRENGTH[level].label}</span>
                </div>
              )}
            </Field>
            <Field label="ยืนยันรหัสผ่านใหม่" required>
              <PasswordInput
                value={pw.confirm}
                onChange={(e) => setPw({ ...pw, confirm: e.target.value })}
                autoComplete="new-password"
                required
              />
              {mismatch && <span className="mt-1.5 block text-xs text-red-600">รหัสผ่านยังไม่ตรงกัน</span>}
            </Field>
            <Button type="submit" loading={savingPw}>
              <KeyRound className="h-4 w-4" /> เปลี่ยนรหัสผ่าน
            </Button>
          </form>
        </Card>
      </div>

      <p className="mt-8 text-center text-sm">
        <Link href="/privacy" className="text-gray-500 underline hover:text-brand-700">
          ประกาศความเป็นส่วนตัว (PDPA)
        </Link>
      </p>

      <div className="mt-4 flex justify-center">
        <Button variant="danger" onClick={() => void logout()}>
          <LogOut className="h-4 w-4" /> ออกจากระบบ
        </Button>
      </div>
    </div>
  );
}
