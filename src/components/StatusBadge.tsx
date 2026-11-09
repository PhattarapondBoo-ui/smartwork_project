import { STATUS_META } from "@/lib/status";
import type { DisplayStatus } from "@/lib/types";
import { cn } from "./ui";

export function StatusBadge({ status, className }: { status: DisplayStatus; className?: string }) {
  const meta = STATUS_META[status];
  return (
    <span
      title={meta.en}
      className={cn("inline-flex shrink-0 items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset", meta.cls, className)}
    >
      {meta.label}
    </span>
  );
}
