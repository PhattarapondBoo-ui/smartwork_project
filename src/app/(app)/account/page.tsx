"use client";

import { useState, type FormEvent } from "react";
import { KeyRound, Save, UserRound } from "lucide-react";
import { useProfile } from "@/lib/auth-context";
import { changeMyPassword, updateMyProfile } from "@/lib/api";
import { errMsg, fmtTs } from "@/lib/format";
import { useToast } from "@/components/toast";
import { Alert, Button, Card, Field, Input, PageHeader } from "@/components/ui";

export default function AccountPage() {
  const me = useProfile();
  const toast = useToast();

  const [profile, setProfile] = useState({ name: me.name, phone: me.phone ?? "" });
  const [profileErr, setProfileErr] = useState<string | null>(null);
  const [savingProfile, setSavingProfile] = useState(false);

  const [pw, setPw] = useState({ current: "", next: "", confirm: "" });
  const [pwErr, setPwErr] = useState<string | null>(null);
  const [savingPw, setSavingPw] = useState(false);

  const saveProfile = async (e: FormEvent) => {
    e.preventDefault();
    setProfileErr(null);
    if (!profile.name.trim()) return setProfileErr("กรุณากรอกชื่อ");
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

  return (
    <>
      <PageHeader title="ตั้งค่าบัญชี" subtitle="แก้ไขข้อมูลส่วนตัวและเปลี่ยนรหัสผ่าน" />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-4 sm:p-5">
          <h2 className="mb-4 flex items-center gap-2 font-semibold">
            <UserRound className="h-5 w-5 text-brand-600" /> ข้อมูลส่วนตัว
          </h2>
          <dl className="mb-4 grid grid-cols-2 gap-3 rounded-lg bg-gray-50 p-3 text-sm">
            <div>
              <dt className="text-xs text-gray-500">ชื่อผู้ใช้</dt>
              <dd className="font-medium">@{me.username}</dd>
            </div>
            <div>
              <dt className="text-xs text-gray-500">สิทธิ์</dt>
              <dd className="font-medium">{me.role === "employer" ? "Employer" : "Employee"}</dd>
            </div>
            <div className="col-span-2">
              <dt className="text-xs text-gray-500">สร้างบัญชีเมื่อ</dt>
              <dd>{fmtTs(me.created_at)}</dd>
            </div>
          </dl>
          <form onSubmit={saveProfile} className="space-y-4">
            {profileErr && <Alert kind="error">{profileErr}</Alert>}
            <Field label="ชื่อ-นามสกุล" required>
              <Input value={profile.name} onChange={(e) => setProfile({ ...profile, name: e.target.value })} required />
            </Field>
            <Field label="เบอร์โทรศัพท์">
              <Input type="tel" value={profile.phone} onChange={(e) => setProfile({ ...profile, phone: e.target.value })} />
            </Field>
            <Button type="submit" loading={savingProfile}>
              <Save className="h-4 w-4" /> บันทึก
            </Button>
          </form>
        </Card>

        <Card className="p-4 sm:p-5">
          <h2 className="mb-4 flex items-center gap-2 font-semibold">
            <KeyRound className="h-5 w-5 text-brand-600" /> เปลี่ยนรหัสผ่าน
          </h2>
          <form onSubmit={savePassword} className="space-y-4">
            {pwErr && <Alert kind="error">{pwErr}</Alert>}
            <Field label="รหัสผ่านปัจจุบัน" required>
              <Input
                type="password"
                value={pw.current}
                onChange={(e) => setPw({ ...pw, current: e.target.value })}
                autoComplete="current-password"
                required
              />
            </Field>
            <Field label="รหัสผ่านใหม่" hint="อย่างน้อย 6 ตัวอักษร" required>
              <Input
                type="password"
                value={pw.next}
                onChange={(e) => setPw({ ...pw, next: e.target.value })}
                autoComplete="new-password"
                required
              />
            </Field>
            <Field label="ยืนยันรหัสผ่านใหม่" required>
              <Input
                type="password"
                value={pw.confirm}
                onChange={(e) => setPw({ ...pw, confirm: e.target.value })}
                autoComplete="new-password"
                required
              />
            </Field>
            <Button type="submit" loading={savingPw}>
              <KeyRound className="h-4 w-4" /> เปลี่ยนรหัสผ่าน
            </Button>
          </form>
        </Card>
      </div>
    </>
  );
}
