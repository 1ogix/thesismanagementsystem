import {
  doc,
  setDoc,
  getDoc,
  updateDoc,
  collection,
  getDocs,
  query,
  where,
  Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { TmsUser, UserRole } from "@/types";
import { getRolesForCapability } from "@/lib/roles";

export async function createUserDocument(
  uid: string,
  data: Omit<TmsUser, "uid" | "createdAt">
): Promise<void> {
  await setDoc(doc(db, "users", uid), {
    ...data,
    uid,
    createdAt: Timestamp.now(),
  });
}

export async function getUsersByCourse(courseId: string): Promise<TmsUser[]> {
  const q = query(collection(db, "users"), where("courseId", "==", courseId));
  const snap = await getDocs(q);
  return snap.docs.map((d) => d.data() as TmsUser);
}

export async function getUsersBySchool(schoolId: string): Promise<TmsUser[]> {
  const q = query(collection(db, "users"), where("schoolId", "==", schoolId));
  const snap = await getDocs(q);
  return snap.docs.map((d) => d.data() as TmsUser);
}

export async function getUserDocument(uid: string): Promise<TmsUser | null> {
  const snap = await getDoc(doc(db, "users", uid));
  if (!snap.exists()) return null;
  return snap.data() as TmsUser;
}

export async function updateUserRole(uid: string, role: UserRole): Promise<void> {
  await updateDoc(doc(db, "users", uid), { role });
}

export async function getAllUsers(): Promise<TmsUser[]> {
  const snap = await getDocs(collection(db, "users"));
  return snap.docs.map((d) => d.data() as TmsUser);
}

export async function getUsersByRole(role: UserRole): Promise<TmsUser[]> {
  const roles = getRolesForCapability("direct", role);
  const q = query(collection(db, "users"), where("role", "in", roles));
  const snap = await getDocs(q);
  return snap.docs.map((d) => d.data() as TmsUser);
}

export async function getUsersByCapability(
  capability: "adviser" | "panel",
): Promise<TmsUser[]> {
  const roles = getRolesForCapability(capability);
  const q = query(collection(db, "users"), where("role", "in", roles));
  const snap = await getDocs(q);
  return snap.docs.map((d) => d.data() as TmsUser);
}

export async function getUsersByCapabilityAndCourse(
  capability: "adviser" | "panel",
  courseId: string,
): Promise<TmsUser[]> {
  const roles = getRolesForCapability(capability);
  const users = await getUsersByCourse(courseId);
  return users.filter((u) => roles.includes(u.role));
}

export async function getUsersByIds(uids: string[]): Promise<TmsUser[]> {
  if (uids.length === 0) return [];
  const promises = uids.map((uid) => getUserDocument(uid));
  const results = await Promise.all(promises);
  return results.filter(Boolean) as TmsUser[];
}
