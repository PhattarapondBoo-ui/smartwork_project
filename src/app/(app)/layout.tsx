"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { AppShell } from "@/components/AppShell";
import { Spinner } from "@/components/ui";

/** Everything in (app) requires a signed-in, active user. */
export default function ProtectedLayout({ children }: { children: ReactNode }) {
  const { profile, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !profile) router.replace("/login");
  }, [loading, profile, router]);

  if (loading || !profile) return <Spinner />;
  return <AppShell>{children}</AppShell>;
}
