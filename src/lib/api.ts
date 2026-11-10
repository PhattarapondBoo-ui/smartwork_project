/**
 * All reads/writes to Firebase live here so pages stay thin.
 * Security is enforced by firestore.rules — the checks below
 * only give friendlier error messages.
 */
import {
  EmailAuthProvider,
  createUserWithEmailAndPassword,
  reauthenticateWithCredential,
  signInWithEmailAndPassword,
  signOut,
  updatePassword,
} from "firebase/auth";
import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
  writeBatch,
  type DocumentSnapshot,
  type Unsubscribe,
} from "firebase/firestore";
import { fb, secondary, usernameToEmail } from "./firebase";
import { compressToDataUrl } from "./image";
import type { AppUser, AssignedType, Role, Submission, Task, UserStatus } from "./types";

type OnError = (e: Error) => void;

function snapData<T>(d: DocumentSnapshot): T {
  return { id: d.id, ...d.data({ serverTimestamps: "estimate" }) } as T;
}

const byCreatedDesc = (a: Task, b: Task) =>
  (b.created_at?.toMillis() ?? 0) - (a.created_at?.toMillis() ?? 0);

/* ------------------------------------------------------------------ setup */

export async function isSetupDone() {
  const snap = await getDoc(doc(fb().db, "meta", "setup"));
  return snap.exists();
}

/** Creates the very first Employer account. Allowed by rules only once. */
export async function setupFirstAdmin(input: { username: string; name: string; password: string }) {
  const email = usernameToEmail(input.username);
  const sec = secondary();
  const cred = await createUserWithEmailAndPassword(sec.auth, email, input.password);
  try {
    const batch = writeBatch(sec.db);
    batch.set(doc(sec.db, "users", cred.user.uid), {
      username: input.username.trim().toLowerCase(),
      name: input.name.trim(),
      phone: "",
      role: "employer",
      status: "active",
      created_at: serverTimestamp(),
      updated_at: serverTimestamp(),
    });
    batch.set(doc(sec.db, "meta", "setup"), { done: true, by: cred.user.uid, created_at: serverTimestamp() });
    await batch.commit();
  } finally {
    await signOut(sec.auth);
  }
  await signInWithEmailAndPassword(fb().auth, email, input.password);
}

/* ------------------------------------------------------------------ tasks */

export function subscribeAllTasks(cb: (t: Task[]) => void, onError: OnError): Unsubscribe {
  const q = query(collection(fb().db, "tasks"), orderBy("created_at", "desc"));
  return onSnapshot(q, (s) => cb(s.docs.map((d) => snapData<Task>(d))), onError);
}

/** Employees see every "all users" task plus anything assigned to them. */
export function subscribeEmployeeTasks(uid: string, cb: (t: Task[]) => void, onError: OnError): Unsubscribe {
  const col = collection(fb().db, "tasks");
  let shared: Task[] | null = null;
  let mine: Task[] | null = null;
  const emit = () => {
    if (!shared || !mine) return;
    const merged = new Map<string, Task>();
    [...shared, ...mine].forEach((t) => merged.set(t.id, t));
    cb([...merged.values()].filter((t) => !t.is_archived).sort(byCreatedDesc));
  };
  const u1 = onSnapshot(
    query(col, where("assigned_type", "==", "all")),
    (s) => {
      shared = s.docs.map((d) => snapData<Task>(d));
      emit();
    },
    onError,
  );
  const u2 = onSnapshot(
    query(col, where("assigned_user", "==", uid)),
    (s) => {
      mine = s.docs.map((d) => snapData<Task>(d));
      emit();
    },
    onError,
  );
  return () => {
    u1();
    u2();
  };
}

export function subscribeTask(id: string, cb: (t: Task | null) => void, onError: OnError): Unsubscribe {
  return onSnapshot(
    doc(fb().db, "tasks", id),
    (d) => cb(d.exists() ? snapData<Task>(d) : null),
    onError,
  );
}

export interface NewTaskInput {
  title: string;
  description: string;
  location: string;
  due_date: string;
  assigned_type: AssignedType;
  assigned_user: AppUser | null;
}

export async function createTask(input: NewTaskInput, creator: AppUser) {
  const { db } = fb();
  const counterRef = doc(db, "meta", "counters");
  const taskRef = doc(collection(db, "tasks"));
  await runTransaction(db, async (tx) => {
    const counter = await tx.get(counterRef);
    const next = ((counter.exists() ? (counter.data().tasks as number) : 0) || 0) + 1;
    tx.set(counterRef, { tasks: next }, { merge: true });
    const individual = input.assigned_type === "user" && input.assigned_user;
    tx.set(taskRef, {
      code: `T-${String(next).padStart(4, "0")}`,
      title: input.title.trim(),
      description: input.description.trim(),
      location: input.location.trim(),
      due_date: input.due_date,
      assigned_type: individual ? "user" : "all",
      assigned_user: individual ? input.assigned_user!.id : null,
      assigned_user_name: individual ? input.assigned_user!.name : null,
      status: "open",
      is_archived: false,
      archived_at: null,
      created_by: creator.id,
      created_by_name: creator.name,
      created_at: serverTimestamp(),
      updated_at: serverTimestamp(),
      claimed_at: null,
      last_submitted_at: null,
    });
  });
  return taskRef.id;
}

/**
 * Claim inside a transaction so two employees pressing "รับงาน" at the same
 * moment can't both win. Rules enforce the same invariant server-side.
 */
export async function claimTask(taskId: string, me: AppUser) {
  const { db } = fb();
  const taskRef = doc(db, "tasks", taskId);
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(taskRef);
    if (!snap.exists()) throw new Error("ไม่พบงานนี้");
    const t = snap.data() as Task;
    if (t.is_archived) throw new Error("งานนี้ถูกเก็บถาวรแล้ว");
    if (t.status !== "open") throw new Error("งานนี้มีผู้รับไปแล้ว");
    if (t.assigned_type === "all" && t.assigned_user) throw new Error("งานนี้มีผู้รับไปแล้ว");
    if (t.assigned_type === "user" && t.assigned_user !== me.id) throw new Error("งานนี้มอบหมายให้ผู้อื่น");
    tx.update(taskRef, {
      status: "claimed",
      assigned_user: me.id,
      assigned_user_name: me.name,
      claimed_at: serverTimestamp(),
      updated_at: serverTimestamp(),
    });
  });
}

export async function startTask(taskId: string) {
  await updateDoc(doc(fb().db, "tasks", taskId), { status: "in_progress", updated_at: serverTimestamp() });
}

export async function setArchived(taskId: string, archived: boolean) {
  await updateDoc(doc(fb().db, "tasks", taskId), {
    is_archived: archived,
    archived_at: archived ? serverTimestamp() : null,
    updated_at: serverTimestamp(),
  });
}

/* ------------------------------------------------------------ submissions */

export function subscribeSubmissions(taskId: string, cb: (s: Submission[]) => void, onError: OnError) {
  const q = query(collection(fb().db, "tasks", taskId, "submissions"), orderBy("submitted_at", "desc"));
  return onSnapshot(q, (s) => cb(s.docs.map((d) => snapData<Submission>(d))), onError);
}

export async function submitWork(
  task: Task,
  me: AppUser,
  note: string,
  files: File[],
  onProgress?: (done: number, total: number) => void,
) {
  const { db } = fb();
  // Shrink every photo first so a bad file fails before anything is written.
  const images: string[] = [];
  for (let i = 0; i < files.length; i++) {
    images.push(await compressToDataUrl(files[i]));
    onProgress?.(i + 1, files.length);
  }

  // Submission + its images + task status go in one atomic batch.
  const batch = writeBatch(db);
  const subRef = doc(collection(db, "tasks", task.id, "submissions"));
  images.forEach((data, index) => {
    batch.set(doc(collection(subRef, "images")), {
      data,
      index,
      user_id: me.id,
      created_at: serverTimestamp(),
    });
  });
  batch.set(subRef, {
    task_id: task.id,
    user_id: me.id,
    user_name: me.name,
    note: note.trim(),
    image_count: images.length,
    submitted_at: serverTimestamp(),
    review_status: "pending",
    review_note: "",
    reviewed_by: null,
    reviewed_by_name: null,
    reviewed_at: null,
  });
  batch.update(doc(db, "tasks", task.id), {
    status: "pending_review",
    updated_at: serverTimestamp(),
    last_submitted_at: serverTimestamp(),
  });
  await batch.commit();
}

/** Images of one submission, in the order they were attached (as data URLs). */
export async function getSubmissionImages(taskId: string, submissionId: string): Promise<string[]> {
  const snap = await getDocs(collection(fb().db, "tasks", taskId, "submissions", submissionId, "images"));
  return snap.docs
    .map((d) => d.data() as { data: string; index: number })
    .sort((a, b) => a.index - b.index)
    .map((d) => d.data);
}

/* ---------------------------------------------------- old-image cleanup */

/** Photos older than this are deleted to keep Firestore under the free 1 GB. */
export const IMAGE_RETENTION_DAYS = 60;
const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Deletes photos of submissions older than IMAGE_RETENTION_DAYS. The note,
 * review result and history entry are kept; only the images go.
 *
 * There is no server on the free plan, so this runs in the browser of an
 * Employer when they open the worklist, at most once a day (meta/cleanup).
 * Submissions still waiting for review are skipped so nothing unreviewed is lost.
 * Returns the number of photos deleted.
 */
export async function purgeOldImages(tasks: Task[]): Promise<number> {
  const { db } = fb();
  const metaRef = doc(db, "meta", "cleanup");
  const meta = await getDoc(metaRef);
  const lastRun = meta.exists() ? (meta.data().last_run as Timestamp | undefined) : undefined;
  if (lastRun && Date.now() - lastRun.toMillis() < DAY_MS) return 0;
  await setDoc(metaRef, { last_run: serverTimestamp() }, { merge: true });

  const cutoffMs = Date.now() - IMAGE_RETENTION_DAYS * DAY_MS;
  const cutoff = Timestamp.fromMillis(cutoffMs);
  let deleted = 0;

  for (const t of tasks) {
    // A submission can't be older than its task.
    if (!t.created_at || t.created_at.toMillis() >= cutoffMs || !t.last_submitted_at) continue;
    // Already cleaned and nothing submitted since.
    if (t.images_cleaned_at && t.images_cleaned_at.toMillis() > t.last_submitted_at.toMillis()) continue;

    const old = await getDocs(
      query(collection(db, "tasks", t.id, "submissions"), where("submitted_at", "<", cutoff)),
    );
    let skippedPending = false;
    for (const s of old.docs) {
      const d = s.data() as Submission;
      if (d.images_deleted_at || !d.image_count) continue;
      if (d.review_status === "pending") {
        skippedPending = true;
        continue;
      }
      const images = await getDocs(collection(s.ref, "images"));
      const batch = writeBatch(db);
      images.docs.forEach((img) => batch.delete(img.ref));
      batch.update(s.ref, { images_deleted_at: serverTimestamp() });
      await batch.commit();
      deleted += images.size;
    }
    // Mark the task done only if every submission is past the cutoff and handled.
    if (!skippedPending && t.last_submitted_at.toMillis() < cutoffMs) {
      await updateDoc(doc(db, "tasks", t.id), { images_cleaned_at: serverTimestamp() });
    }
  }
  return deleted;
}

export async function reviewSubmission(
  taskId: string,
  submissionId: string,
  decision: "approved" | "rejected",
  note: string,
  reviewer: AppUser,
) {
  const { db } = fb();
  const batch = writeBatch(db);
  batch.update(doc(db, "tasks", taskId, "submissions", submissionId), {
    review_status: decision,
    review_note: note.trim(),
    reviewed_by: reviewer.id,
    reviewed_by_name: reviewer.name,
    reviewed_at: serverTimestamp(),
  });
  batch.update(doc(db, "tasks", taskId), { status: decision, updated_at: serverTimestamp() });
  await batch.commit();
}

/* ------------------------------------------------------------------ users */

export function subscribeUsers(cb: (u: AppUser[]) => void, onError: OnError): Unsubscribe {
  const q = query(collection(fb().db, "users"), orderBy("created_at", "desc"));
  return onSnapshot(q, (s) => cb(s.docs.map((d) => snapData<AppUser>(d))), onError);
}

export async function createUserAccount(input: {
  username: string;
  password: string;
  name: string;
  phone: string;
  role: Role;
}) {
  const sec = secondary();
  const cred = await createUserWithEmailAndPassword(sec.auth, usernameToEmail(input.username), input.password);
  try {
    // Written with the employer's (primary) session — rules require employer role.
    await setDoc(doc(fb().db, "users", cred.user.uid), {
      username: input.username.trim().toLowerCase(),
      name: input.name.trim(),
      phone: input.phone.trim(),
      role: input.role,
      status: "active",
      created_at: serverTimestamp(),
      updated_at: serverTimestamp(),
    });
  } finally {
    await signOut(sec.auth);
  }
}

export async function updateUser(
  id: string,
  patch: Partial<{ name: string; phone: string; role: Role; status: UserStatus }>,
) {
  await updateDoc(doc(fb().db, "users", id), { ...patch, updated_at: serverTimestamp() });
}

export async function updateMyProfile(uid: string, patch: { name: string; phone: string }) {
  await updateDoc(doc(fb().db, "users", uid), {
    name: patch.name.trim(),
    phone: patch.phone.trim(),
    updated_at: serverTimestamp(),
  });
}

export async function changeMyPassword(currentPassword: string, newPassword: string) {
  const { auth, db } = fb();
  const user = auth.currentUser;
  if (!user?.email) throw new Error("กรุณาเข้าสู่ระบบใหม่");
  await reauthenticateWithCredential(user, EmailAuthProvider.credential(user.email, currentPassword));
  await updatePassword(user, newPassword);
  await addDoc(collection(db, "users", user.uid, "password_history"), {
    user_id: user.uid,
    changed_at: serverTimestamp(),
  });
}
