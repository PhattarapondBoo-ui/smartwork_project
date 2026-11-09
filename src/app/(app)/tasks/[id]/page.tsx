"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Archive,
  ArchiveRestore,
  ArrowLeft,
  CalendarDays,
  Check,
  Hand,
  MapPin,
  Play,
  User,
  PenLine,
  Undo2,
} from "lucide-react";
import { useProfile } from "@/lib/auth-context";
import { claimTask, reviewSubmission, setArchived, startTask, subscribeSubmissions, subscribeTask } from "@/lib/api";
import { errMsg, fmtDate, fmtTs } from "@/lib/format";
import { SUBMITTABLE, assigneeLabel, canClaim, displayStatus, isOverdue } from "@/lib/status";
import type { Submission, Task } from "@/lib/types";
import { StatusBadge } from "@/components/StatusBadge";
import { SubmissionCard } from "@/components/SubmissionCard";
import { SubmitWorkForm } from "@/components/SubmitWorkForm";
import { useToast } from "@/components/toast";
import { Alert, Button, Card, Field, Spinner, Textarea, cn } from "@/components/ui";

export default function TaskDetailPage() {
  const { id } = useParams<{ id: string }>();
  const me = useProfile();
  const toast = useToast();
  const isEmployer = me.role === "employer";

  const [task, setTask] = useState<Task | null | undefined>(undefined);
  const [subs, setSubs] = useState<Submission[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [reviewNote, setReviewNote] = useState("");

  useEffect(
    () =>
      subscribeTask(id, setTask, (e) => {
        setError(errMsg(e));
        setTask(null);
      }),
    [id],
  );

  const mine = !!task && task.assigned_user === me.id;
  const canSeeSubs = !!task && (isEmployer || mine);

  useEffect(() => {
    if (!canSeeSubs) {
      setSubs([]);
      return;
    }
    return subscribeSubmissions(id, setSubs, (e) => setError(errMsg(e)));
  }, [id, canSeeSubs]);

  if (task === undefined) return <Spinner />;
  if (task === null) {
    return (
      <div className="py-16 text-center">
        <p className="text-gray-600">{error ?? "ไม่พบงานนี้ หรือคุณไม่มีสิทธิ์เข้าถึง"}</p>
        <Link href="/tasks" className="mt-3 inline-block text-sm font-medium text-brand-700 underline">
          กลับไปหน้ารายการงาน
        </Link>
      </div>
    );
  }

  const run = async (key: string, fn: () => Promise<void>, ok: string) => {
    setBusy(key);
    try {
      await fn();
      toast.success(ok);
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setBusy(null);
    }
  };

  const latest = subs[0];
  const awaitingReview = isEmployer && !task.is_archived && task.status === "pending_review" && latest?.review_status === "pending";
  const overdue = isOverdue(task);

  const review = (decision: "approved" | "rejected") => {
    if (!latest) return;
    if (decision === "rejected" && !reviewNote.trim()) {
      toast.error("กรุณาระบุเหตุผลที่ส่งกลับแก้ไข");
      return;
    }
    void run(
      decision,
      async () => {
        await reviewSubmission(task.id, latest.id, decision, reviewNote, me);
        setReviewNote("");
      },
      decision === "approved" ? "อนุมัติงานแล้ว" : "ส่งกลับให้แก้ไขแล้ว",
    );
  };

  const toggleArchive = () => {
    const msg = task.is_archived ? "กู้คืนงานนี้กลับมาใช้งาน?" : "ลบงานนี้? (งานจะถูกเก็บเป็น Archived และกู้คืนได้ตลอดเวลา)";
    if (!window.confirm(msg)) return;
    void run("archive", () => setArchived(task.id, !task.is_archived), task.is_archived ? "กู้คืนงานแล้ว" : "ย้ายงานไป Archived แล้ว");
  };

  const lastRejected = subs.find((s) => s.review_status === "rejected");

  return (
    <div className="space-y-4">
      <Link href="/tasks" className="inline-flex items-center gap-1 text-sm text-gray-600 hover:text-brand-700">
        <ArrowLeft className="h-4 w-4" /> กลับ
      </Link>

      <Card className="overflow-hidden">
        <div className="border-b border-gray-100 bg-brand-50/60 p-4 sm:p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="text-xs font-semibold text-brand-700">{task.code}</div>
              <h1 className="text-lg font-bold text-gray-900 sm:text-xl">{task.title}</h1>
            </div>
            <StatusBadge status={displayStatus(task)} />
          </div>
        </div>

        <div className="space-y-4 p-4 sm:p-5">
          {task.description && <p className="whitespace-pre-wrap text-sm text-gray-700">{task.description}</p>}

          <dl className="grid gap-3 text-sm sm:grid-cols-2">
            <Info icon={MapPin} label="พื้นที่ปฏิบัติงาน" value={task.location || "-"} />
            <Info
              icon={CalendarDays}
              label="วันที่ครบกำหนด"
              value={`${fmtDate(task.due_date)}${overdue ? " (เลยกำหนด)" : ""}`}
              danger={overdue}
            />
            <Info icon={User} label="ผู้รับผิดชอบ" value={assigneeLabel(task)} />
            <Info icon={PenLine} label="สร้างโดย" value={`${task.created_by_name} · ${fmtTs(task.created_at)}`} />
          </dl>

          {/* ---------------- Employee actions ---------------- */}
          {!isEmployer && (
            <div className="space-y-3 border-t border-gray-100 pt-4">
              {canClaim(task, me.id) && (
                <Button
                  className="w-full sm:w-auto"
                  loading={busy === "claim"}
                  onClick={() => void run("claim", () => claimTask(task.id, me), "รับงานเรียบร้อย")}
                >
                  <Hand className="h-4 w-4" /> รับงาน
                </Button>
              )}
              {!mine && task.assigned_user && (
                <Alert kind="info">งานนี้ถูกรับโดย {task.assigned_user_name} แล้ว</Alert>
              )}
              {mine && task.status === "claimed" && (
                <Button
                  variant="outline"
                  className="w-full sm:w-auto"
                  loading={busy === "start"}
                  onClick={() => void run("start", () => startTask(task.id), "เริ่มดำเนินการแล้ว")}
                >
                  <Play className="h-4 w-4" /> เริ่มดำเนินการ
                </Button>
              )}
              {mine && task.status === "rejected" && lastRejected && (
                <Alert kind="error">
                  งานถูกส่งกลับแก้ไข{lastRejected.review_note ? `: ${lastRejected.review_note}` : ""}
                </Alert>
              )}
              {mine && task.status === "pending_review" && <Alert kind="warning">ส่งงานแล้ว กำลังรอตรวจสอบ</Alert>}
              {mine && task.status === "approved" && <Alert kind="success">งานนี้ได้รับการอนุมัติแล้ว 🎉</Alert>}
            </div>
          )}

          {/* ---------------- Employer actions ---------------- */}
          {isEmployer && (
            <div className="flex flex-wrap gap-2 border-t border-gray-100 pt-4">
              <Button variant={task.is_archived ? "outline" : "danger"} loading={busy === "archive"} onClick={toggleArchive}>
                {task.is_archived ? <ArchiveRestore className="h-4 w-4" /> : <Archive className="h-4 w-4" />}
                {task.is_archived ? "กู้คืนงาน (Restore)" : "ลบงาน"}
              </Button>
            </div>
          )}
        </div>
      </Card>

      {!isEmployer && mine && !task.is_archived && SUBMITTABLE.includes(task.status) && (
        <Card className="p-4 sm:p-5">
          <h2 className="mb-4 font-semibold text-gray-900">{task.status === "rejected" ? "ส่งงานแก้ไข" : "ส่งงาน"}</h2>
          <SubmitWorkForm task={task} me={me} />
        </Card>
      )}

      {awaitingReview && latest && (
        <Card className="border-orange-200 p-4 sm:p-5">
          <h2 className="mb-3 font-semibold text-gray-900">ตรวจงาน</h2>
          <SubmissionCard sub={latest} index={subs.length} />
          <div className="mt-4 space-y-3">
            <Field label="ความเห็นผู้ตรวจ" hint="จำเป็นเมื่อส่งกลับแก้ไข">
              <Textarea value={reviewNote} onChange={(e) => setReviewNote(e.target.value)} />
            </Field>
            <div className="grid grid-cols-2 gap-2 sm:flex">
              <Button variant="success" loading={busy === "approved"} disabled={!!busy} onClick={() => review("approved")}>
                <Check className="h-4 w-4" /> อนุมัติ
              </Button>
              <Button variant="danger" loading={busy === "rejected"} disabled={!!busy} onClick={() => review("rejected")}>
                <Undo2 className="h-4 w-4" /> ส่งกลับแก้ไข
              </Button>
            </div>
          </div>
        </Card>
      )}

      {canSeeSubs && (
        <Card className="p-4 sm:p-5">
          <h2 className="mb-3 font-semibold text-gray-900">
            ประวัติการส่งงาน <span className="font-normal text-gray-400">({subs.length})</span>
          </h2>
          {subs.length === 0 ? (
            <p className="text-sm text-gray-500">ยังไม่มีการส่งงาน</p>
          ) : (
            <div className="space-y-3">
              {subs.map((s, i) => (
                <SubmissionCard key={s.id} sub={s} index={subs.length - i} />
              ))}
            </div>
          )}
        </Card>
      )}
    </div>
  );
}

function Info({
  icon: Icon,
  label,
  value,
  danger,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  danger?: boolean;
}) {
  return (
    <div className="flex gap-2.5">
      <Icon className={cn("mt-0.5 h-4 w-4 shrink-0", danger ? "text-brand-600" : "text-gray-400")} />
      <div className="min-w-0">
        <dt className="text-xs text-gray-500">{label}</dt>
        <dd className={cn("break-words text-gray-900", danger && "font-medium text-brand-700")}>{value}</dd>
      </div>
    </div>
  );
}
