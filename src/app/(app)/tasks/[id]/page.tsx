"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Archive,
  ArchiveRestore,
  ArrowLeft,
  CalendarClock,
  Check,
  ClipboardCheck,
  Hand,
  History,
  MapPin,
  PenLine,
  Play,
  Send,
  Undo2,
  User,
} from "lucide-react";
import { useProfile } from "@/lib/auth-context";
import { claimTask, reviewSubmission, setArchived, startTask, subscribeSubmissions, subscribeTask } from "@/lib/api";
import { errMsg, fmtDate, fmtTs } from "@/lib/format";
import { SUBMITTABLE, assigneeLabel, canClaim, displayStatus, dueInfo } from "@/lib/status";
import type { Submission, Task } from "@/lib/types";
import { HeroPattern } from "@/components/Brand";
import { StatusBadge } from "@/components/StatusBadge";
import { SubmissionCard } from "@/components/SubmissionCard";
import { SubmitWorkForm } from "@/components/SubmitWorkForm";
import { useToast } from "@/components/toast";
import { Alert, Button, Card, Field, SectionTitle, Spinner, Textarea, cn } from "@/components/ui";

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
  const awaitingReview =
    isEmployer && !task.is_archived && task.status === "pending_review" && latest?.review_status === "pending";
  const due = dueInfo(task);
  const lastRejected = subs.find((s) => s.review_status === "rejected");

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
    const msg = task.is_archived
      ? "กู้คืนงานนี้กลับมาใช้งาน?"
      : "ลบงานนี้? (งานจะถูกเก็บเป็น Archived และกู้คืนได้ตลอดเวลา)";
    if (!window.confirm(msg)) return;
    void run(
      "archive",
      () => setArchived(task.id, !task.is_archived),
      task.is_archived ? "กู้คืนงานแล้ว" : "ย้ายงานไป Archived แล้ว",
    );
  };

  // What should the person looking at this page do next?
  const employeeAction = (() => {
    if (isEmployer) return null;
    if (canClaim(task, me.id)) {
      return (
        <Button loading={busy === "claim"} onClick={() => void run("claim", () => claimTask(task.id, me), "รับงานเรียบร้อย")}>
          <Hand className="h-4 w-4" /> รับงานนี้
        </Button>
      );
    }
    if (mine && task.status === "claimed") {
      return (
        <Button
          variant="outline"
          loading={busy === "start"}
          onClick={() => void run("start", () => startTask(task.id), "เริ่มดำเนินการแล้ว")}
        >
          <Play className="h-4 w-4" /> เริ่มทำงาน
        </Button>
      );
    }
    return null;
  })();

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <Link
        href="/tasks"
        className="glass inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium text-gray-600 ring-1 ring-gray-200/80 transition hover:text-brand-700"
      >
        <ArrowLeft className="h-4 w-4" /> รายการงาน
      </Link>

      {/* ------------------------------------------------ hero */}
      <section
        className={cn(
          "relative overflow-hidden rounded-xl rounded-br-[3rem] bg-brand-600 px-6 py-7 text-white shadow-sm sm:px-8",
          task.is_archived && "grayscale-[60%]",
        )}
      >
        <HeroPattern className="pointer-events-none absolute inset-y-0 right-0 h-full w-full opacity-50 sm:w-[55%] sm:opacity-100" />
        <div className="relative flex flex-wrap items-center gap-2">
          <span className="rounded-md bg-white/15 px-2.5 py-1 font-mono text-xs tracking-wide text-white">{task.code}</span>
          <StatusBadge status={displayStatus(task)} />
        </div>
        <h1 className="relative mt-3 max-w-2xl font-display text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">{task.title}</h1>
      </section>

      <section className="glass rounded-xl p-6 shadow-sm ring-1 ring-gray-200/80 sm:p-8">
        {task.description && (
          <p className="mb-6 max-w-2xl whitespace-pre-wrap text-[15px] leading-relaxed text-gray-700">{task.description}</p>
        )}

        <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <InfoTile icon={MapPin} label="พื้นที่" value={task.location || "-"} />
          <InfoTile
            icon={CalendarClock}
            label="ครบกำหนด"
            value={fmtDate(task.due_date)}
            note={due.tone !== "muted" ? due.label : undefined}
            tone={due.tone === "late" ? "danger" : due.tone === "soon" ? "warn" : undefined}
          />
          <InfoTile icon={User} label="ผู้รับผิดชอบ" value={assigneeLabel(task)} />
          <InfoTile icon={PenLine} label="สร้างโดย" value={task.created_by_name} note={fmtTs(task.created_at)} />
        </dl>

        {!task.is_archived && <ProgressTracker task={task} />}

        {(employeeAction || isEmployer) && (
          <div className="mt-6 flex flex-wrap items-center gap-2">
            {employeeAction}
            {isEmployer && (
              <Button variant={task.is_archived ? "outline" : "danger"} loading={busy === "archive"} onClick={toggleArchive}>
                {task.is_archived ? <ArchiveRestore className="h-4 w-4" /> : <Archive className="h-4 w-4" />}
                {task.is_archived ? "กู้คืนงาน" : "ลบงาน"}
              </Button>
            )}
          </div>
        )}
      </section>

      {/* ------------------------------------------------ status messages */}
      {!isEmployer && !mine && task.assigned_user && (
        <Alert kind="info">งานนี้ถูกรับโดย {task.assigned_user_name} แล้ว</Alert>
      )}
      {mine && task.status === "rejected" && lastRejected && (
        <Alert kind="error">
          <span className="font-semibold">งานถูกส่งกลับแก้ไข</span>
          {lastRejected.review_note ? ` — “${lastRejected.review_note}”` : ""}
        </Alert>
      )}
      {mine && task.status === "pending_review" && <Alert kind="warning">ส่งงานแล้ว กำลังรอหัวหน้าตรวจสอบ</Alert>}
      {mine && task.status === "approved" && <Alert kind="success">งานนี้ได้รับการอนุมัติแล้ว ขอบคุณที่ทำให้ทุกที่สะอาดเอี่ยม ✨</Alert>}

      {/* ------------------------------------------------ submit work */}
      {!isEmployer && mine && !task.is_archived && SUBMITTABLE.includes(task.status) && (
        <Card className="p-5 sm:p-7">
          <SectionTitle
            icon={Send}
            title={task.status === "rejected" ? "ส่งงานแก้ไข" : "ส่งงาน"}
            hint="ถ่ายรูปผลงานให้เห็นชัด แนบได้สูงสุด 10 รูป พร้อมหมายเหตุ"
          />
          <SubmitWorkForm task={task} me={me} />
        </Card>
      )}

      {/* ------------------------------------------------ review */}
      {awaitingReview && latest && (
        <Card className="p-5 ring-2 ring-brand-200 sm:p-7">
          <SectionTitle icon={ClipboardCheck} title="ตรวจงาน" hint={`ส่งโดย ${latest.user_name} · ${fmtTs(latest.submitted_at)}`} />
          <SubmissionCard sub={latest} index={subs.length} bare />
          <div className="mt-5 space-y-4">
            <Field label="ความเห็นผู้ตรวจ" hint="จำเป็นเมื่อส่งกลับแก้ไข พนักงานจะเห็นข้อความนี้">
              <Textarea value={reviewNote} onChange={(e) => setReviewNote(e.target.value)} placeholder="เช่น เก็บมุมห้องเพิ่ม เช็ดกระจกให้ใสขึ้น" />
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

      {/* ------------------------------------------------ history */}
      {canSeeSubs && (
        <Card className="p-5 sm:p-7">
          <SectionTitle
            icon={History}
            title="ประวัติการส่งงาน"
            aside={<span className="rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-800">{subs.length} ครั้ง</span>}
          />
          {subs.length === 0 ? (
            <p className="rounded-2xl bg-gray-50 px-4 py-6 text-center text-sm text-gray-500">ยังไม่มีการส่งงาน</p>
          ) : (
            <ol className="relative space-y-4 before:absolute before:bottom-3 before:left-[11px] before:top-3 before:w-px before:bg-brand-100">
              {subs.map((s, i) => (
                <li key={s.id} className="relative pl-9">
                  <span
                    className={cn(
                      "absolute left-0 top-4 flex h-6 w-6 items-center justify-center rounded-full ring-4 ring-white",
                      s.review_status === "approved"
                        ? "bg-emerald-500"
                        : s.review_status === "rejected"
                          ? "bg-red-400"
                          : "bg-brand-300",
                    )}
                  />
                  <SubmissionCard sub={s} index={subs.length - i} />
                </li>
              ))}
            </ol>
          )}
        </Card>
      )}
    </div>
  );
}

function InfoTile({
  icon: Icon,
  label,
  value,
  note,
  tone,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  note?: string;
  tone?: "danger" | "warn";
}) {
  return (
    <div className="rounded-lg bg-gray-50 p-3.5 ring-1 ring-gray-100 sm:p-4">
      <dt className="flex items-center gap-1.5 text-xs text-gray-500">
        <Icon className="h-3.5 w-3.5 text-brand-500" />
        {label}
      </dt>
      <dd className="mt-1 break-words text-[15px] font-medium text-brand-700">{value}</dd>
      {note && (
        <dd
          className={cn(
            "mt-0.5 text-xs",
            tone === "danger" ? "font-medium text-red-600" : tone === "warn" ? "font-medium text-amber-600" : "text-gray-400",
          )}
        >
          {note}
        </dd>
      )}
    </div>
  );
}

const STEPS: { key: Task["status"]; label: string }[] = [
  { key: "open", label: "เปิดรับ" },
  { key: "claimed", label: "รับงาน" },
  { key: "in_progress", label: "กำลังทำ" },
  { key: "pending_review", label: "รอตรวจ" },
  { key: "approved", label: "เสร็จสิ้น" },
];

/** Segmented progress bar (like a booking stepper); "rejected" shows red on the review step. */
function ProgressTracker({ task }: { task: Task }) {
  const rejected = task.status === "rejected";
  const current = rejected ? 3 : STEPS.findIndex((s) => s.key === task.status);
  const done = task.status === "approved";

  return (
    <ol className="mt-7 grid grid-cols-5 gap-1.5">
      {STEPS.map((s, i) => {
        const reached = done || i <= current;
        const isCurrent = !done && i === current;
        const isRejectedHere = rejected && i === 3;
        return (
          <li key={s.key} className="min-w-0">
            <span
              className={cn(
                "block h-1.5 rounded-sm",
                isRejectedHere ? "bg-red-500" : reached ? "bg-brand-600" : "bg-gray-300",
              )}
            />
            <span
              className={cn(
                "mt-2 block truncate text-center text-[11px] sm:text-sm",
                isRejectedHere
                  ? "font-medium text-red-600"
                  : isCurrent || (done && i === STEPS.length - 1)
                    ? "font-medium text-brand-700"
                    : reached
                      ? "text-brand-600/80"
                      : "text-gray-400",
              )}
            >
              {isRejectedHere ? "ส่งกลับแก้ไข" : s.label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
