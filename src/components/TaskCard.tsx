"use client";

import Link from "next/link";
import { Archive, ArchiveRestore, CalendarDays, ChevronRight, Hand, Lock, MapPin, User } from "lucide-react";
import { fmtDate } from "@/lib/format";
import { assigneeLabel, canClaim, displayStatus, isOverdue } from "@/lib/status";
import type { AppUser, Task } from "@/lib/types";
import { StatusBadge } from "./StatusBadge";
import { Button, Card, cn } from "./ui";

interface Props {
  task: Task;
  me: AppUser;
  busy?: boolean;
  onClaim?: (t: Task) => void;
  onToggleArchive?: (t: Task) => void;
}

export function TaskCard({ task: t, me, busy, onClaim, onToggleArchive }: Props) {
  const isEmployer = me.role === "employer";
  const mine = t.assigned_user === me.id;
  const claimable = canClaim(t, me.id);
  const takenByOther = !isEmployer && !mine && !!t.assigned_user;
  const overdue = isOverdue(t);

  return (
    <Card className={cn("flex flex-col p-4", t.is_archived && "bg-gray-50 opacity-80")}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="text-xs font-medium text-gray-400">{t.code}</div>
          <Link href={`/tasks/${t.id}`} className="line-clamp-2 font-semibold text-gray-900 hover:text-brand-700">
            {t.title}
          </Link>
        </div>
        <StatusBadge status={displayStatus(t)} />
      </div>

      {t.description && <p className="mt-2 line-clamp-2 text-sm text-gray-600">{t.description}</p>}

      <dl className="mt-3 space-y-1.5 text-sm text-gray-600">
        <div className="flex items-center gap-2">
          <MapPin className="h-4 w-4 shrink-0 text-gray-400" />
          <span className="truncate">{t.location || "-"}</span>
        </div>
        <div className={cn("flex items-center gap-2", overdue && "font-medium text-brand-700")}>
          <CalendarDays className={cn("h-4 w-4 shrink-0", overdue ? "text-brand-600" : "text-gray-400")} />
          <span>
            ครบกำหนด {fmtDate(t.due_date)}
            {overdue && " (เลยกำหนด)"}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <User className="h-4 w-4 shrink-0 text-gray-400" />
          <span className="truncate">
            {assigneeLabel(t)}
            {mine && !isEmployer && <span className="ml-1 text-brand-700">(คุณ)</span>}
          </span>
        </div>
      </dl>

      <div className="mt-4 flex flex-wrap gap-2 border-t border-gray-100 pt-3">
        {!isEmployer && claimable && (
          <Button onClick={() => onClaim?.(t)} loading={busy} className="flex-1">
            <Hand className="h-4 w-4" /> รับงาน
          </Button>
        )}
        {takenByOther && (
          <Button disabled variant="ghost" className="flex-1 bg-gray-100">
            <Lock className="h-4 w-4" /> มีผู้รับงานแล้ว
          </Button>
        )}
        {isEmployer && (
          <Button variant={t.is_archived ? "outline" : "danger"} onClick={() => onToggleArchive?.(t)} loading={busy}>
            {t.is_archived ? <ArchiveRestore className="h-4 w-4" /> : <Archive className="h-4 w-4" />}
            {t.is_archived ? "กู้คืน" : "ลบงาน"}
          </Button>
        )}
        <Link
          href={`/tasks/${t.id}`}
          className="ml-auto inline-flex min-h-[42px] items-center gap-1 rounded-lg px-3 text-sm font-medium text-brand-700 hover:bg-brand-50"
        >
          {isEmployer && t.status === "pending_review" && !t.is_archived ? "ตรวจงาน" : "รายละเอียด"}
          <ChevronRight className="h-4 w-4" />
        </Link>
      </div>
    </Card>
  );
}
