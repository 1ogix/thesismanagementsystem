import {
  collection,
  addDoc,
  getDoc,
  getDocs,
  doc,
  Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { School } from "@/types";

export async function getSchool(schoolId: string): Promise<School | null> {
  const snap = await getDoc(doc(db, "schools", schoolId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as School;
}

export async function getAllSchools(): Promise<School[]> {
  const snap = await getDocs(collection(db, "schools"));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as School));
}

export async function createSchool(name: string): Promise<string> {
  const ref = await addDoc(collection(db, "schools"), {
    name,
    createdAt: Timestamp.now(),
  });
  return ref.id;
}
