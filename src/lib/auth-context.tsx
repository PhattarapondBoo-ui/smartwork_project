"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { onAuthStateChanged, signOut, type User } from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";
import { fb } from "./firebase";
import type { AppUser } from "./types";

interface AuthState {
  user: User | null;
  profile: AppUser | null;
  loading: boolean;
  /** Message to show on the login page (e.g. account disabled, config missing). */
  notice: string | null;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    let auth;
    try {
      auth = fb().auth;
    } catch (e) {
      setNotice((e as Error).message);
      setLoading(false);
      return;
    }
    const authRef = auth;
    let unsubProfile: (() => void) | undefined;

    const kick = (message: string) => {
      setNotice(message);
      setProfile(null);
      setLoading(false);
      void signOut(authRef);
    };

    const unsubAuth = onAuthStateChanged(authRef, (u) => {
      unsubProfile?.();
      unsubProfile = undefined;
      setUser(u);
      if (!u) {
        setProfile(null);
        setLoading(false);
        return;
      }
      setLoading(true);
      // Live subscription: a deactivated user is signed out immediately.
      unsubProfile = onSnapshot(
        doc(fb().db, "users", u.uid),
        (snap) => {
          if (!snap.exists()) return kick("ไม่พบข้อมูลผู้ใช้ในระบบ กรุณาติดต่อผู้ดูแลระบบ");
          const p = { id: snap.id, ...snap.data() } as AppUser;
          if (p.status !== "active") return kick("บัญชีนี้ถูกปิดการใช้งาน กรุณาติดต่อผู้ดูแลระบบ");
          setNotice(null);
          setProfile(p);
          setLoading(false);
        },
        () => kick("ไม่สามารถโหลดข้อมูลผู้ใช้ได้"),
      );
    });

    return () => {
      unsubAuth();
      unsubProfile?.();
    };
  }, []);

  const logout = async () => {
    setNotice(null);
    await signOut(fb().auth);
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, notice, logout }}>{children}</AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}

/** For pages under the (app) layout, which only renders once a profile exists. */
export function useProfile(): AppUser {
  const { profile } = useAuth();
  if (!profile) throw new Error("useProfile used outside an authenticated page");
  return profile;
}
