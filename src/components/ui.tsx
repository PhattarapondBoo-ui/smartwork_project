"use client";

import {
  useEffect,
  useState,
  type ButtonHTMLAttributes,
  type ComponentType,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from "react";
import { Eye, EyeOff, Loader2, X } from "lucide-react";
import { HeroPattern } from "./Brand";

export function cn(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

type Variant = "primary" | "outline" | "ghost" | "danger" | "success";

const VARIANTS: Record<Variant, string> = {
  primary: "bg-accent-500 text-on-accent shadow-sm ring-1 ring-inset ring-accent-700/50 hover:bg-accent-600",
  outline: "bg-white text-brand-700 ring-1 ring-inset ring-brand-600 hover:bg-brand-50",
  ghost: "text-gray-700 hover:bg-gray-100",
  danger: "bg-white text-red-700 ring-1 ring-inset ring-red-200 hover:bg-red-50",
  success: "bg-brand-600 text-white shadow-sm hover:bg-brand-700",
};

export function Button({
  variant = "primary",
  loading,
  className,
  children,
  disabled,
  type = "button",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; loading?: boolean }) {
  return (
    <button
      type={type}
      className={cn(
        "inline-flex min-h-[44px] items-center justify-center gap-2 rounded-md px-5 py-2 text-[15px] font-medium transition active:scale-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-600/40 disabled:cursor-not-allowed disabled:opacity-50",
        VARIANTS[variant],
        className,
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" />}
      {children}
    </button>
  );
}

const fieldCls =
  "w-full rounded-md border border-brand-100 bg-gray-50 px-4 py-3 text-base text-gray-900 placeholder:text-gray-400 transition focus:border-brand-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-100 disabled:bg-gray-100 disabled:text-gray-500 sm:text-sm";

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(fieldCls, className)} {...props} />;
}

/** Password input with a show/hide toggle. */
export function PasswordInput({ className, ...props }: Omit<InputHTMLAttributes<HTMLInputElement>, "type">) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input type={show ? "text" : "password"} className={cn(fieldCls, "pr-12", className)} {...props} />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-700"
        aria-label={show ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน"}
        tabIndex={-1}
      >
        {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
}

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(fieldCls, "min-h-[110px] leading-relaxed", className)} {...props} />;
}

export function Select({ className, children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={cn(fieldCls, "pr-9", className)} {...props}>
      {children}
    </select>
  );
}

export function Field({ label, hint, children, required }: { label: string; hint?: string; children: ReactNode; required?: boolean }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-brand-700">
        {label}
        {required && <span className="text-accent-700"> *</span>}
      </span>
      {children}
      {hint && <span className="mt-1.5 block text-xs leading-relaxed text-gray-400">{hint}</span>}
    </label>
  );
}

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div
      className={cn(
        "glass rounded-xl shadow-[0_1px_1px_rgba(255,255,255,0.8)_inset,0_16px_40px_-20px_rgba(16,42,67,0.10)] ring-1 ring-gray-200/80",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function Alert({ kind = "info", children }: { kind?: "info" | "error" | "success" | "warning"; children: ReactNode }) {
  const cls = {
    info: "bg-brand-100 text-brand-800 ring-brand-100",
    error: "bg-red-50 text-red-800 ring-red-200",
    success: "bg-emerald-50 text-emerald-800 ring-emerald-200",
    warning: "bg-amber-50 text-amber-800 ring-amber-200",
  }[kind];
  return <div className={cn("rounded-md px-4 py-3 text-sm leading-relaxed ring-1 ring-inset", cls)}>{children}</div>;
}

export function Spinner({ label = "กำลังโหลด..." }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-16 text-gray-500">
      <Loader2 className="h-5 w-5 animate-spin text-brand-500" />
      <span className="text-sm">{label}</span>
    </div>
  );
}

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="font-display text-3xl font-light tracking-tight text-gray-900 sm:text-[2.5rem] sm:leading-tight">{title}</h1>
        {subtitle && <p className="mt-0.5 text-sm text-gray-500">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

/** Solid navy title band used at the top of every page (rounded bottom-right corner). */
export function PageHero({
  eyebrow,
  title,
  subtitle,
  action,
  children,
  className,
}: {
  eyebrow?: string;
  title: ReactNode;
  subtitle?: ReactNode;
  action?: ReactNode;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "relative mb-6 overflow-hidden rounded-xl rounded-br-[3rem] bg-brand-600 px-6 py-7 text-white shadow-sm sm:px-8 sm:py-8",
        className,
      )}
    >
      <HeroPattern className="pointer-events-none absolute inset-y-0 right-0 h-full w-full opacity-60 sm:w-[60%] sm:opacity-100" />
      <div className="relative flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          {eyebrow && <p className="text-sm font-light text-brand-100">{eyebrow}</p>}
          <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight sm:text-4xl">{title}</h1>
          {subtitle && <div className="mt-2 max-w-xl text-[15px] font-light leading-relaxed text-white/85">{subtitle}</div>}
        </div>
        {action}
      </div>
      {children && <div className="relative mt-6">{children}</div>}
    </section>
  );
}

/** Dashed divider between form sections. */
export function SectionDivider() {
  return <hr className="my-7 border-0 border-t border-dashed border-teal-300/70" />;
}

/** Small icon chip + heading used for card sections. */
export function SectionTitle({
  icon: Icon,
  title,
  hint,
  aside,
}: {
  icon: ComponentType<{ className?: string }>;
  title: ReactNode;
  hint?: ReactNode;
  aside?: ReactNode;
}) {
  return (
    <div className="mb-5 flex items-start gap-3">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-brand-50 text-brand-600">
        <Icon className="h-5 w-5" />
      </span>
      <div className="min-w-0 flex-1">
        <h2 className="text-lg font-medium text-brand-700">{title}</h2>
        {hint && <p className="mt-0.5 text-sm text-gray-500">{hint}</p>}
      </div>
      {aside}
    </div>
  );
}

export function EmptyState({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-lg border border-dashed border-gray-300 bg-white px-4 py-14 text-center text-sm text-gray-500">
      {children}
    </div>
  );
}

/** Bottom sheet on phones, centered dialog on larger screens. */
export function Modal({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-brand-900/40 sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        className="max-h-[92vh] w-full overflow-y-auto rounded-t-2xl bg-white p-6 shadow-2xl sm:max-w-lg sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-gray-200 sm:hidden" />
        <div className="mb-5 flex items-center justify-between gap-3">
          <h2 className="font-display text-xl font-medium text-brand-700">{title}</h2>
          <button onClick={onClose} className="rounded-full p-2 text-gray-500 hover:bg-gray-100" aria-label="ปิด">
            <X className="h-5 w-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
