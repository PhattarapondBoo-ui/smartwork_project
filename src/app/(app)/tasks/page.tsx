"use client";

import { useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import { useProfile } from "@/lib/auth-context";
import { claimTask, setArchived, subscribeAllTasks, subscribeEmployeeTasks } from "@/lib/api";
import { errMsg } from "@/lib/format";
import type { Task } from "@/lib/types";
import { StatCards, type StatKey } from "@/components/StatCards";
import { TaskCard } from "@/components/TaskCard";
import { useToast } from "@/components/toast";
import { Alert, EmptyState, Input, PageHeader, Spinner, cn } from "@/components/ui";

type FilterKey = StatKey | "mine" | "open" | "rejected" | "archived";

const FILTERS: { key: FilterKey; label: string; only?: "employer" | "employee" }[] = [
  { key: "all", label: "ทั้งหมด" },
  { key: "mine", label: "งานของฉัน", only: "employee" },
  { key: "open", label: "เปิดรับงาน" },
  { key: "active", label: "กำลังดำเนินการ" },
  { key: "pending_review", label: "รอตรวจสอบ" },
  { key: "rejected", label: "ส่งกลับแก้ไข" },
  { key: "approved", label: "เสร็จสิ้น" },
  { key: "archived", label: "Archived", only: "employer" },
];

const ACTIVE: Task["status"][] = ["claimed", "in_progress", "rejected"];

export default function TasksPage() {
  const me = useProfile();
  const toast = useToast();
  const isEmployer = me.role === "employer";
  const [tasks, setTasks] = useState<Task[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterKey>("all");
  const [search, setSearch] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    const onErr = (e: Error) => setError(errMsg(e));
    return isEmployer ? subscribeAllTasks(setTasks, onErr) : subscribeEmployeeTasks(me.id, setTasks, onErr);
  }, [isEmployer, me.id]);

  const stats = useMemo(() => {
    const live = (tasks ?? []).filter((t) => !t.is_archived);
    // For employees, progress counters only count their own work.
    const scope = isEmployer ? live : live.filter((t) => t.assigned_user === me.id);
    return {
      total: live.length,
      active: scope.filter((t) => ACTIVE.includes(t.status)).length,
      pending: scope.filter((t) => t.status === "pending_review").length,
      done: scope.filter((t) => t.status === "approved").length,
    };
  }, [tasks, isEmployer, me.id]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (tasks ?? []).filter((t) => {
      const match = (() => {
        switch (filter) {
          case "all":
            return true; // employer "all" intentionally includes archived tasks
          case "mine":
            return t.assigned_user === me.id;
          case "archived":
            return t.is_archived;
          case "active":
            return !t.is_archived && ACTIVE.includes(t.status);
          default:
            return !t.is_archived && t.status === filter;
        }
      })();
      if (!match) return false;
      if (!q) return true;
      return [t.code, t.title, t.location, t.description, t.assigned_user_name ?? ""].some((s) =>
        s.toLowerCase().includes(q),
      );
    });
  }, [tasks, filter, search, me.id]);

  const onClaim = async (t: Task) => {
    setBusyId(t.id);
    try {
      await claimTask(t.id, me);
      toast.success(`รับงาน "${t.title}" เรียบร้อย`);
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setBusyId(null);
    }
  };

  const onToggleArchive = async (t: Task) => {
    const msg = t.is_archived
      ? `กู้คืนงาน "${t.title}" กลับมาใช้งาน?`
      : `ลบงาน "${t.title}"?\n(งานจะถูกเก็บเป็น Archived และกู้คืนได้ตลอดเวลา)`;
    if (!window.confirm(msg)) return;
    setBusyId(t.id);
    try {
      await setArchived(t.id, !t.is_archived);
      toast.success(t.is_archived ? "กู้คืนงานแล้ว" : "ย้ายงานไป Archived แล้ว");
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <>
      <PageHeader
        title="รายการงาน"
        subtitle={isEmployer ? "ดู ติดตาม และตรวจสอบงานทั้งหมด" : "งานที่มอบหมายให้คุณและงานที่เปิดให้ทุกคน"}
      />

      <StatCards stats={stats} active={filter} onSelect={(k) => setFilter(k)} />

      <div className="mt-5 flex flex-col gap-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ค้นหา รหัส ชื่องาน พื้นที่ ผู้รับผิดชอบ..."
            className="pl-9"
          />
        </div>
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
          {FILTERS.filter((f) => !f.only || f.only === me.role).map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={cn(
                "shrink-0 rounded-full border px-3.5 py-1.5 text-sm font-medium transition",
                filter === f.key
                  ? "border-brand-600 bg-brand-600 text-white"
                  : "border-gray-300 bg-white text-gray-600 hover:border-brand-300",
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4">
        {error && <Alert kind="error">{error}</Alert>}
        {!tasks && !error && <Spinner />}
        {tasks && visible.length === 0 && <EmptyState>ไม่พบงานในหมวดนี้</EmptyState>}
        {tasks && visible.length > 0 && (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {visible.map((t) => (
              <TaskCard
                key={t.id}
                task={t}
                me={me}
                busy={busyId === t.id}
                onClaim={onClaim}
                onToggleArchive={onToggleArchive}
              />
            ))}
          </div>
        )}
      </div>
    </>
  );
}
