import { getApps, initializeApp, type FirebaseApp, type FirebaseOptions } from "firebase/app";
import { getAuth, initializeAuth, inMemoryPersistence, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";
import { getStorage, type FirebaseStorage } from "firebase/storage";

// NEXT_PUBLIC_* vars must be referenced literally so Next.js can inline them.
const firebaseConfig: FirebaseOptions = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

export const EMAIL_DOMAIN = process.env.NEXT_PUBLIC_LOGIN_EMAIL_DOMAIN || "worklist.local";

/** Usernames are mapped to synthetic emails for Firebase Auth. */
export function usernameToEmail(username: string) {
  return `${username.trim().toLowerCase()}@${EMAIL_DOMAIN}`;
}

export const USERNAME_PATTERN = /^[a-z0-9._-]{3,30}$/;

interface FirebaseHandles {
  app: FirebaseApp;
  auth: Auth;
  db: Firestore;
  storage: FirebaseStorage;
}

let primary: FirebaseHandles | null = null;

/**
 * Lazily initialised Firebase handles. Only call from effects / event handlers
 * (browser side) so `next build` never needs Firebase credentials.
 */
export function fb(): FirebaseHandles {
  if (!primary) {
    if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
      throw new Error("ยังไม่ได้ตั้งค่า Firebase: คัดลอก .env.local.example เป็น .env.local แล้วกรอกค่า");
    }
    const app = getApps().find((a) => a.name === "[DEFAULT]") ?? initializeApp(firebaseConfig);
    primary = { app, auth: getAuth(app), db: getFirestore(app), storage: getStorage(app) };
  }
  return primary;
}

let secondaryHandles: { auth: Auth; db: Firestore } | null = null;

/**
 * A second Firebase app instance with in-memory auth. Used to create new
 * accounts without signing the current employer out of the primary app.
 */
export function secondary() {
  if (!secondaryHandles) {
    fb(); // validates config
    const app = getApps().find((a) => a.name === "secondary") ?? initializeApp(firebaseConfig, "secondary");
    let auth: Auth;
    try {
      auth = initializeAuth(app, { persistence: inMemoryPersistence });
    } catch {
      auth = getAuth(app); // already initialised (e.g. dev hot reload)
    }
    secondaryHandles = { auth, db: getFirestore(app) };
  }
  return secondaryHandles;
}
