"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { ShieldAlert } from "lucide-react";
import { useProfile } from "@/lib/auth-context";

export function RequireEmployer({ children }: { children: ReactNode }) {
  const me = useProfile();
  if (me.role !== "employer") {
    return (
      <div className="flex flex-col items-center gap-3 py-16 text-center">
        <ShieldAlert className="h-10 w-10 text-brand-600" />
        <p className="text-gray-700">หน้านี้สำหรับผู้ดูแลระบบเท่านั้น</p>
        <Link href="/tasks" className="text-sm font-medium text-brand-700 underline">
          กลับไปหน้ารายการงาน
        </Link>
      </div>
    );
  }
  return <>{children}</>;
}
