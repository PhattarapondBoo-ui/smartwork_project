import { CircleCheck, Hourglass, Layers, Loader } from "lucide-react";
import { cn } from "./ui";

export type StatKey = "all" | "active" | "pending_review" | "approved";

export interface Stats {
  total: number;
  active: number;
  pending: number;
  done: number;
}

const CARDS = [
  { key: "all", label: "งานทั้งหมด", field: "total", icon: Layers, tone: "bg-brand-600 text-white", iconTone: "bg-white/20 text-white" },
  { key: "active", label: "กำลังดำเนินการ", field: "active", icon: Loader, tone: "bg-white", iconTone: "bg-amber-50 text-amber-600" },
  { key: "pending_review", label: "รอตรวจสอบ", field: "pending", icon: Hourglass, tone: "bg-white", iconTone: "bg-orange-50 text-orange-600" },
  { key: "approved", label: "เสร็จสิ้น", field: "done", icon: CircleCheck, tone: "bg-white", iconTone: "bg-green-50 text-green-600" },
] as const;

export function StatCards({ stats, active, onSelect }: { stats: Stats; active?: string; onSelect?: (k: StatKey) => void }) {
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {CARDS.map((c) => {
        const Icon = c.icon;
        const selected = active === c.key;
        return (
          <button
            key={c.key}
            type="button"
            onClick={() => onSelect?.(c.key)}
            className={cn(
              "flex items-center gap-3 rounded-xl border p-3 text-left shadow-sm transition sm:p-4",
              c.tone,
              c.tone.includes("brand") ? "border-brand-600" : "border-gray-200 hover:border-brand-200",
              selected && "ring-2 ring-brand-600 ring-offset-2",
            )}
          >
            <span className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-lg", c.iconTone)}>
              <Icon className="h-5 w-5" />
            </span>
            <span className="min-w-0">
              <span className={cn("block truncate text-xs sm:text-sm", c.tone.includes("brand") ? "text-white/85" : "text-gray-500")}>
                {c.label}
              </span>
              <span className="block text-2xl font-bold leading-tight">{stats[c.field]}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
