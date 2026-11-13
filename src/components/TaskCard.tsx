"use client";

import Link from "next/link";
import { Archive, ArchiveRestore, ArrowUpRight, Banknote, CalendarClock, Hand, Lock, MapPin, Trash2, Users } from "lucide-react";
import { formatBaht } from "@/lib/promptpay";
import { canClaim, displayStatus, dueInfo } from "@/lib/status";
import type { AppUser, Task } from "@/lib/types";
import { Avatar } from "./AppShell";
import { StatusBadge } from "./StatusBadge";
import { Button, cn } from "./ui";

interface Props {
  task: Task;
  me: AppUser;
  busy?: boolean;
  onClaim?: (t: Task) => void;
  onToggleArchive?: (t: Task) => void;
  onDelete?: (t: Task) => void;
}

const DUE_TONE = {
  muted: "bg-white/70 text-gray-500 ring-1 ring-inset ring-gray-200/70",
  ok: "bg-white/70 text-gray-600 ring-1 ring-inset ring-gray-200/70",
  soon: "bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-200",
  late: "bg-red-50 text-red-700 ring-1 ring-inset ring-red-200",
};

export function TaskCard({ task: t, me, busy, onClaim, onToggleArchive, onDelete }: Props) {
  const isEmployer = me.role === "employer";
  const mine = t.assigned_user === me.id;
  const claimable = canClaim(t, me.id);
  const takenByOther = !isEmployer && !mine && !!t.assigned_user;
  const due = dueInfo(t);
  const needsReview = isEmployer && t.status === "pending_review" && !t.is_archived;

  return (
    <article
      className={cn(
        "glass group relative flex flex-col rounded-xl p-4 ring-1 ring-gray-200/80 transition duration-300 sm:p-5",
        "shadow-[0_1px_1px_rgba(255,255,255,0.8)_inset,0_16px_40px_-20px_rgba(16,42,67,0.10)] hover:-translate-y-1 hover:shadow-[0_1px_1px_rgba(255,255,255,0.8)_inset,0_24px_48px_-20px_rgba(16,42,67,0.10)]",
        t.is_archived && "opacity-70",
        needsReview && "ring-2 ring-accent-700/60",
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="rounded-md bg-brand-50 px-1.5 py-0.5 font-mono text-[11px] font-medium tracking-wide text-brand-600">{t.code}</span>
        <StatusBadge status={displayStatus(t)} />
      </div>

      <Link href={`/tasks/${t.id}`} className="mt-3 block">
        <h3 className="line-clamp-2 font-display text-lg font-medium leading-snug text-brand-700 transition group-hover:text-brand-500">
          {t.title}
        </h3>
        {t.description && <p className="mt-1 line-clamp-2 text-sm text-gray-500">{t.description}</p>}
      </Link>

      <div className="mt-3 flex flex-wrap gap-1.5 text-xs font-medium">
        <span className="inline-flex max-w-full items-center gap-1 rounded-lg bg-white/70 px-2 py-1 text-gray-600 ring-1 ring-inset ring-gray-200/70">
          <MapPin className="h-3.5 w-3.5 shrink-0 text-gray-400" />
          <span className="truncate">{t.location || "-"}</span>
        </span>
        <span className={cn("inline-flex items-center gap-1 rounded-lg px-2 py-1", DUE_TONE[due.tone])}>
          <CalendarClock className="h-3.5 w-3.5 shrink-0 opacity-70" />
          {due.label}
        </span>
        {(t.price ?? 0) > 0 && (
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-lg px-2 py-1",
              t.payment_id
                ? "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200"
                : t.status === "approved"
                  ? "bg-accent-50 text-on-accent ring-1 ring-inset ring-accent-700/50"
                  : "bg-white/70 text-gray-700 ring-1 ring-inset ring-gray-200/70",
            )}
          >
            <Banknote className="h-3.5 w-3.5 shrink-0 opacity-70" />
            {formatBaht(t.price!)}
            {t.payment_id ? " · จ่ายแล้ว" : t.status === "approved" ? " · รอจ่าย" : ""}
          </span>
        )}
      </div>

      <div className="mt-auto flex items-center gap-3 pt-4">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          {t.assigned_user_name ? (
            <>
              <Avatar name={t.assigned_user_name} className="h-7 w-7 text-xs" />
              <span className="truncate text-sm text-gray-700">
                {t.assigned_user_name}
                {mine && !isEmployer && <span className="text-gray-400"> (คุณ)</span>}
              </span>
            </>
          ) : (
            <>
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-500">
                <Users className="h-3.5 w-3.5" />
              </span>
              <span className="truncate text-sm text-gray-500">เปิดให้ทุกคน</span>
            </>
          )}
        </div>

        {isEmployer && t.status === "approved" && onDelete && (
          <button
            type="button"
            onClick={() => onDelete(t)}
            disabled={busy}
            title="ลบถาวร (งานที่อนุมัติแล้ว)"
            aria-label="ลบถาวร"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-gray-400 transition hover:bg-red-50 hover:text-red-700 disabled:opacity-50"
          >
            <Trash2 className="h-[18px] w-[18px]" />
          </button>
        )}

        {isEmployer && (
          <button
            type="button"
            onClick={() => onToggleArchive?.(t)}
            disabled={busy}
            title={t.is_archived ? "กู้คืนงาน" : "ลบงาน (เก็บเป็น Archived)"}
            aria-label={t.is_archived ? "กู้คืนงาน" : "ลบงาน"}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-gray-400 transition hover:bg-red-50 hover:text-red-700 disabled:opacity-50"
          >
            {t.is_archived ? <ArchiveRestore className="h-[18px] w-[18px]" /> : <Archive className="h-[18px] w-[18px]" />}
          </button>
        )}

        {!isEmployer && claimable ? (
          <Button onClick={() => onClaim?.(t)} loading={busy} className="min-h-9 shrink-0 px-3.5 py-1.5">
            <Hand className="h-4 w-4" /> รับงาน
          </Button>
        ) : takenByOther ? (
          <span className="inline-flex shrink-0 items-center gap-1 rounded-xl bg-gray-100 px-3 py-2 text-xs font-medium text-gray-500">
            <Lock className="h-3.5 w-3.5" /> มีผู้รับแล้ว
          </span>
        ) : (
          <Link
            href={`/tasks/${t.id}`}
            className={cn(
              "inline-flex h-9 shrink-0 items-center gap-1 rounded-xl px-3 text-sm font-semibold transition",
              needsReview
                ? "bg-accent-500 text-on-accent shadow-sm ring-1 ring-inset ring-accent-700/50 hover:bg-accent-600"
                : "bg-brand-50 text-brand-700 hover:bg-brand-100",
            )}
          >
            {needsReview ? "ตรวจงาน" : "เปิด"}
            <ArrowUpRight className="h-4 w-4" />
          </Link>
        )}
      </div>
    </article>
  );
}
