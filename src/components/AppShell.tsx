"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { ClipboardList, LogOut, SquarePlus, UserCog, Users } from "lucide-react";
import { useAuth, useProfile } from "@/lib/auth-context";
import { cn } from "./ui";

const EMPLOYER_NAV = [
  { href: "/tasks", label: "รายการงาน", icon: ClipboardList },
  { href: "/create", label: "เพิ่มงาน", icon: SquarePlus },
  { href: "/users", label: "จัดการบุคคล", icon: Users },
  { href: "/account", label: "บัญชี", icon: UserCog },
];

const EMPLOYEE_NAV = [
  { href: "/tasks", label: "รายการงาน", icon: ClipboardList },
  { href: "/account", label: "บัญชี", icon: UserCog },
];

export function AppShell({ children }: { children: ReactNode }) {
  const me = useProfile();
  const { logout } = useAuth();
  const pathname = usePathname();
  const nav = me.role === "employer" ? EMPLOYER_NAV : EMPLOYEE_NAV;
  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-40 bg-brand-600 text-white shadow">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 px-4">
          <Link href="/tasks" className="flex items-center gap-2 font-bold">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-brand-600">
              <ClipboardList className="h-5 w-5" />
            </span>
            <span className="text-lg">Worklist</span>
          </Link>
          <div className="flex items-center gap-2">
            <div className="hidden text-right leading-tight sm:block">
              <div className="text-sm font-medium">{me.name}</div>
              <div className="text-xs text-white/75">{me.role === "employer" ? "Employer" : "Employee"}</div>
            </div>
            <button
              onClick={() => void logout()}
              className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm hover:bg-white/15"
              aria-label="ออกจากระบบ"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">ออกจากระบบ</span>
            </button>
          </div>
        </div>
        {/* Desktop tabs */}
        <nav className="hidden border-t border-white/15 bg-white text-gray-600 sm:block">
          <div className="mx-auto flex max-w-6xl gap-1 px-4">
            {nav.map((n) => (
              <Link
                key={n.href}
                href={n.href}
                className={cn(
                  "flex items-center gap-2 border-b-2 px-3 py-3 text-sm font-medium transition",
                  isActive(n.href) ? "border-brand-600 text-brand-700" : "border-transparent hover:text-brand-700",
                )}
              >
                <n.icon className="h-4 w-4" />
                {n.label}
              </Link>
            ))}
          </div>
        </nav>
      </header>

      <main className="mx-auto max-w-6xl px-4 pb-28 pt-5 sm:pb-10">{children}</main>

      {/* Mobile bottom nav */}
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-gray-200 bg-white pb-[env(safe-area-inset-bottom)] sm:hidden">
        <div className="grid" style={{ gridTemplateColumns: `repeat(${nav.length}, minmax(0, 1fr))` }}>
          {nav.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className={cn(
                "flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium",
                isActive(n.href) ? "text-brand-600" : "text-gray-500",
              )}
            >
              <n.icon className="h-5 w-5" />
              {n.label}
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
}
