"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { ClipboardList, LogOut, SquarePlus, UserCog, Users, Wallet } from "lucide-react";
import { BrandMark, BrandName } from "./Brand";
import { useAuth, useProfile } from "@/lib/auth-context";
import { cn } from "./ui";

const EMPLOYER_NAV = [
  { href: "/tasks", label: "รายการงาน", icon: ClipboardList },
  { href: "/create", label: "เพิ่มงาน", icon: SquarePlus },
  { href: "/users", label: "จัดการบุคคล", icon: Users },
  { href: "/payments", label: "การเงิน", icon: Wallet },
  { href: "/account", label: "บัญชี", icon: UserCog },
];

const EMPLOYEE_NAV = [
  { href: "/tasks", label: "รายการงาน", icon: ClipboardList },
  { href: "/payments", label: "การเงิน", icon: Wallet },
  { href: "/account", label: "บัญชี", icon: UserCog },
];

export function Avatar({ name, className }: { name: string; className?: string }) {
  return (
    <span
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full bg-brand-600 font-medium text-white ring-2 ring-white",
        className ?? "h-9 w-9 text-sm",
      )}
      aria-hidden
    >
      {name.trim().charAt(0) || "?"}
    </span>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const me = useProfile();
  const { logout } = useAuth();
  const pathname = usePathname();
  const nav = me.role === "employer" ? EMPLOYER_NAV : EMPLOYEE_NAV;
  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-40 glass border-b border-white/70">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-4">
          <Link href="/tasks" className="flex items-center gap-2.5">
            <BrandMark className="shadow-sm" />
            <BrandName />
          </Link>

          {/* Desktop navigation */}
          <nav className="mx-auto hidden items-center gap-1 sm:flex">
            {nav.map((n) => (
              <Link
                key={n.href}
                href={n.href}
                className={cn(
                  "flex items-center gap-2 rounded-md px-4 py-2 text-[15px] transition",
                  isActive(n.href) ? "bg-brand-50 font-medium text-brand-700" : "text-gray-500 hover:text-brand-700",
                )}
              >
                <n.icon className="h-4 w-4" />
                {n.label}
              </Link>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-2 sm:ml-0">
            <Link href="/account" className="flex items-center gap-2.5 rounded-full py-1 pl-1 pr-1 hover:bg-gray-100 sm:pr-3">
              <Avatar name={me.name} />
              <span className="hidden leading-tight lg:block">
                <span className="block text-sm font-semibold text-gray-900">{me.name}</span>
                <span className="block text-xs text-gray-500">{me.role === "employer" ? "ผู้ดูแลระบบ" : "ผู้รับจ้าง"}</span>
              </span>
            </Link>
            <button
              onClick={() => void logout()}
              className="flex h-9 w-9 items-center justify-center rounded-full text-gray-500 transition hover:bg-red-50 hover:text-red-700"
              aria-label="ออกจากระบบ"
              title="ออกจากระบบ"
            >
              <LogOut className="h-[18px] w-[18px]" />
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 pb-32 pt-6 sm:pb-12 sm:pt-8">{children}</main>

      {/* Mobile floating tab bar */}
      <nav className="fixed inset-x-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-40 glass rounded-xl p-1.5 shadow-[0_16px_40px_-12px_rgba(16,42,67,0.10)] ring-1 ring-gray-200/80 sm:hidden">
        <div className="grid" style={{ gridTemplateColumns: `repeat(${nav.length}, minmax(0, 1fr))` }}>
          {nav.map((n) => {
            const active = isActive(n.href);
            return (
              <Link
                key={n.href}
                href={n.href}
                className={cn(
                  "flex flex-col items-center gap-1 rounded-lg py-2 text-[11px] font-medium transition",
                  active ? "bg-brand-600 text-white" : "text-gray-500",
                )}
              >
                <n.icon className={cn("h-5 w-5", active && "stroke-[2.25]")} />
                {n.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
