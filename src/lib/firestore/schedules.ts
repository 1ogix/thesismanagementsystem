import {
  collection,
  addDoc,
  getDocs,
  doc,
  updateDoc,
  query,
  where,
  Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { DefenseSchedule } from "@/types";

export async function createSchedule(
  data: Omit<DefenseSchedule, "id" | "createdAt">
): Promise<string> {
  const ref = await addDoc(collection(db, "defenseSchedules"), {
    ...data,
    createdAt: Timestamp.now(),
  });
  return ref.id;
}

export async function getSchedulesByThesis(
  thesisId: string
): Promise<DefenseSchedule[]> {
  const q = query(
    collection(db, "defenseSchedules"),
    where("thesisId", "==", thesisId)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as DefenseSchedule));
}

export async function updateSchedule(
  scheduleId: string,
  data: Pick<DefenseSchedule, "scheduledAt" | "venue">
): Promise<void> {
  await updateDoc(doc(db, "defenseSchedules", scheduleId), {
    scheduledAt: data.scheduledAt,
    venue: data.venue,
  });
}

export async function getAllSchedules(): Promise<DefenseSchedule[]> {
  const snap = await getDocs(collection(db, "defenseSchedules"));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as DefenseSchedule));
}
