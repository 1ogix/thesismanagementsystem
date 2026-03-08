import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  updateDoc,
  query,
  where,
  arrayUnion,
  Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Group } from "@/types";

export async function createGroup(
  name: string,
  leaderId: string
): Promise<string> {
  const ref = await addDoc(collection(db, "groups"), {
    name,
    members: [leaderId],
    leaderId,
    adviserId: null,
    status: "forming",
    createdAt: Timestamp.now(),
  });
  return ref.id;
}

export async function getGroup(groupId: string): Promise<Group | null> {
  const snap = await getDoc(doc(db, "groups", groupId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as Group;
}

export async function getGroupByMember(userId: string): Promise<Group | null> {
  const q = query(
    collection(db, "groups"),
    where("members", "array-contains", userId)
  );
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const d = snap.docs[0];
  return { id: d.id, ...d.data() } as Group;
}

export async function addMemberToGroup(
  groupId: string,
  userId: string
): Promise<void> {
  await updateDoc(doc(db, "groups", groupId), {
    members: arrayUnion(userId),
    status: "active",
  });
}

export async function assignAdviserToGroup(
  groupId: string,
  adviserId: string
): Promise<void> {
  await updateDoc(doc(db, "groups", groupId), { adviserId });
}

export async function updateGroupStatus(
  groupId: string,
  status: Group["status"]
): Promise<void> {
  await updateDoc(doc(db, "groups", groupId), { status });
}

export async function getAllGroups(): Promise<Group[]> {
  const snap = await getDocs(collection(db, "groups"));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Group));
}

export async function getGroupsByAdviser(adviserId: string): Promise<Group[]> {
  const q = query(
    collection(db, "groups"),
    where("adviserId", "==", adviserId)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Group));
}
