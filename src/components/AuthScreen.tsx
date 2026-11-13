import type { ReactNode } from "react";
import { BrandMark, BrandName, HeroPattern } from "./Brand";

/** Login / setup screen: navy graphic band, brand, then a clean white card. */
export function AuthScreen({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-4 py-10">
      <div className="mb-6 flex w-full max-w-sm flex-col items-center">
        <div className="relative mb-5 h-36 w-full overflow-hidden rounded-xl rounded-br-[3rem] bg-brand-600 shadow-sm">
          <HeroPattern className="absolute inset-0 h-full w-full" />
        </div>
        <div className="flex items-center gap-2.5">
          <BrandMark className="h-10 w-10" />
          <BrandName className="text-3xl" />
        </div>
        <p className="mt-1 text-sm text-gray-500">บริการทำความสะอาด · ระบบจัดการและตรวจงาน</p>
      </div>
      <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-[0_20px_50px_-24px_rgba(16,42,67,0.10)] ring-1 ring-gray-200/70">
        <h2 className="font-display text-xl font-medium text-brand-700">{title}</h2>
        {subtitle && <p className="mt-1 text-sm text-gray-500">{subtitle}</p>}
        <div className="mt-5">{children}</div>
      </div>
    </div>
  );
}
