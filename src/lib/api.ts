/**
 * All reads/writes to Firebase live here so pages stay thin.
 * Security is enforced by firestore.rules / storage.rules — the checks below
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
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
  type DocumentSnapshot,
  type Unsubscribe,
} from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { fb, secondary, usernameToEmail } from "./firebase";
import { compressImage, extFor } from "./image";
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
  const { db, storage } = fb();
  const urls: string[] = [];
  const paths: string[] = [];
  const stamp = Date.now();
  for (let i = 0; i < files.length; i++) {
    const blob = await compressImage(files[i]);
    const type = blob.type || "image/jpeg";
    const path = `submissions/${task.id}/${me.id}/${stamp}-${i}.${extFor(type)}`;
    const fileRef = ref(storage, path);
    await uploadBytes(fileRef, blob, { contentType: type });
    urls.push(await getDownloadURL(fileRef));
    paths.push(path);
    onProgress?.(i + 1, files.length);
  }
  const batch = writeBatch(db);
  batch.set(doc(collection(db, "tasks", task.id, "submissions")), {
    task_id: task.id,
    user_id: me.id,
    user_name: me.name,
    note: note.trim(),
    image_urls: urls,
    image_paths: paths,
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
