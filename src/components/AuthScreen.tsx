import type { ReactNode } from "react";
import { ClipboardList } from "lucide-react";

/** Red-and-white backdrop for login / setup screens. */
export function AuthScreen({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-gradient-to-br from-brand-600 to-brand-800 px-4 py-10">
      <div className="mb-6 flex flex-col items-center text-white">
        <span className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-brand-600 shadow-lg">
          <ClipboardList className="h-8 w-8" />
        </span>
        <h1 className="text-2xl font-bold">Worklist Management</h1>
        <p className="text-sm text-white/80">ระบบติดตามและตรวจสอบงาน</p>
      </div>
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
        <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
        {subtitle && <p className="mt-1 text-sm text-gray-500">{subtitle}</p>}
        <div className="mt-5">{children}</div>
      </div>
    </div>
  );
}
