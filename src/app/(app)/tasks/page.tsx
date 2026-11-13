"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { BellRing, ChevronRight, Plus, Search } from "lucide-react";
import { useProfile } from "@/lib/auth-context";
import { claimTask, purgeOldImages, setArchived, subscribeAllTasks, subscribeEmployeeTasks } from "@/lib/api";
import { errMsg } from "@/lib/format";
import type { Task } from "@/lib/types";
import { HeroPattern } from "@/components/Brand";
import { TaskCard } from "@/components/TaskCard";
import { useToast } from "@/components/toast";
import { Alert, EmptyState, Spinner, cn } from "@/components/ui";

type FilterKey = "all" | "mine" | "open" | "active" | "pending_review" | "rejected" | "approved" | "archived";

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

const ACTIVE: Task["status"][] = ["claimed", "in_progress"];

function matchesFilter(t: Task, key: FilterKey, uid: string) {
  switch (key) {
    case "all":
      return true; // employer "all" intentionally includes archived tasks
    case "mine":
      return t.assigned_user === uid;
    case "archived":
      return t.is_archived;
    case "active":
      return !t.is_archived && ACTIVE.includes(t.status);
    default:
      return !t.is_archived && t.status === key;
  }
}

// Old-photo cleanup runs at most once per page load (and once a day overall, see purgeOldImages).
let cleanupStarted = false;

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

  // Employers' browsers delete photos older than 60 days in the background.
  useEffect(() => {
    if (!isEmployer || !tasks || cleanupStarted) return;
    cleanupStarted = true;
    purgeOldImages(tasks)
      .then((n) => n > 0 && toast.success(`ลบรูปที่เก่ากว่า 60 วันแล้ว ${n} รูป เพื่อประหยัดพื้นที่`))
      .catch((e) => console.warn("Old-image cleanup failed", e));
  }, [isEmployer, tasks, toast]);

  const filters = FILTERS.filter((f) => !f.only || f.only === me.role);

  const counts = useMemo(() => {
    const list = tasks ?? [];
    return Object.fromEntries(
      FILTERS.map((f) => [f.key, list.filter((t) => matchesFilter(t, f.key, me.id)).length]),
    ) as Record<FilterKey, number>;
  }, [tasks, me.id]);

  // The one thing each role should act on next.
  const attention = useMemo(() => {
    if (!tasks) return null;
    if (isEmployer) {
      return counts.pending_review > 0
        ? { key: "pending_review" as const, text: `มี ${counts.pending_review} งานรอคุณตรวจสอบ` }
        : null;
    }
    const sentBack = tasks.filter((t) => !t.is_archived && t.status === "rejected" && t.assigned_user === me.id).length;
    return sentBack > 0 ? { key: "rejected" as const, text: `มี ${sentBack} งานถูกส่งกลับให้แก้ไข` } : null;
  }, [tasks, isEmployer, counts, me.id]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (tasks ?? []).filter((t) => {
      if (!matchesFilter(t, filter, me.id)) return false;
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

  const firstName = me.name.trim().split(/\s+/)[0];
  const today = new Date().toLocaleDateString("th-TH", { weekday: "long", day: "numeric", month: "long" });

  return (
    <>
      {/* Hero: greeting on a navy band with an abstract graphic pattern */}
      <section className="relative mb-6 overflow-hidden rounded-xl rounded-br-[3rem] bg-brand-600 text-white shadow-sm">
        <HeroPattern className="pointer-events-none absolute inset-y-0 right-0 h-full w-full opacity-60 sm:w-[65%] sm:opacity-100" />
        <div className="relative">
          <div className="relative z-10 p-6 sm:p-9">
            <p className="text-sm font-light text-brand-100">{today}</p>
            <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight sm:text-4xl">
              สวัสดี, {firstName}
            </h1>
            <p className="mt-2 max-w-sm text-[15px] font-light leading-relaxed text-white/85">
              {isEmployer
                ? "ทุกห้องสะอาด เริ่มจากทีมที่เป็นระบบ — ติดตามและตรวจงานของทีมได้ที่นี่"
                : "งานที่มอบหมายให้คุณและงานที่เปิดให้ทุกคน วันนี้ทำให้สะอาดเอี่ยมกันเลย"}
            </p>
            {isEmployer && (
              <Link
                href="/create"
                className="mt-5 inline-flex items-center gap-2 rounded-md bg-accent-500 px-5 py-2.5 text-[15px] font-medium text-on-accent shadow-sm transition hover:bg-accent-600"
              >
                <Plus className="h-4 w-4" /> เพิ่มงานใหม่
              </Link>
            )}
          </div>
        </div>
      </section>

      {attention && filter !== attention.key && (
        <button
          type="button"
          onClick={() => setFilter(attention.key)}
          className="group mb-5 flex w-full items-center gap-3 rounded-md bg-brand-100 px-4 py-3.5 text-left shadow-[0_10px_30px_-14px_rgba(16,42,67,0.10)] ring-1 ring-inset ring-brand-200 transition hover:ring-brand-300"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand-400 to-brand-600 text-white shadow-md shadow-brand-600/30">
            <BellRing className="h-[18px] w-[18px]" />
          </span>
          <span className="flex-1 text-sm font-medium text-brand-900">{attention.text}</span>
          <ChevronRight className="h-5 w-5 shrink-0 text-brand-400 transition group-hover:translate-x-0.5" />
        </button>
      )}

      <div className="relative">
        <Search className="pointer-events-none absolute left-4 top-1/2 z-10 h-[18px] w-[18px] -translate-y-1/2 text-gray-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="ค้นหารหัส ชื่องาน พื้นที่ หรือผู้รับผิดชอบ"
          className="glass w-full rounded-md py-3.5 pl-11 pr-4 text-base shadow-[0_10px_30px_-16px_rgba(16,42,67,0.10)] ring-1 ring-gray-200/80 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-600/30 sm:text-sm"
        />
      </div>

      <nav className="no-scrollbar -mx-4 mt-4 flex gap-2 overflow-x-auto px-4 pb-1" aria-label="กรองสถานะงาน">
        {filters.map((f) => {
          const active = filter === f.key;
          const n = counts[f.key];
          const alert = !active && f.key === "pending_review" && n > 0 && isEmployer;
          return (
            <button
              key={f.key}
              type="button"
              onClick={() => setFilter(f.key)}
              aria-current={active ? "page" : undefined}
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
                  active ? "bg-white/20 text-white" : alert ? "bg-brand-600 text-white" : "bg-gray-100 text-gray-500",
                )}
              >
                {n}
              </span>
            </button>
          );
        })}
      </nav>

      <div className="mt-5">
        {error && <Alert kind="error">{error}</Alert>}
        {!tasks && !error && <Spinner />}
        {tasks && visible.length === 0 && <EmptyState>ไม่พบงานในหมวดนี้</EmptyState>}
        {tasks && visible.length > 0 && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
