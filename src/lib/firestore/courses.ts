import {
  collection,
  addDoc,
  getDoc,
  getDocs,
  doc,
  updateDoc,
  query,
  where,
  Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Course } from "@/types";

export async function getCourse(courseId: string): Promise<Course | null> {
  const snap = await getDoc(doc(db, "courses", courseId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as Course;
}

export async function getCoursesBySchool(schoolId: string): Promise<Course[]> {
  const q = query(collection(db, "courses"), where("schoolId", "==", schoolId));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Course));
}

export async function getActiveCoursesBySchool(schoolId: string): Promise<Course[]> {
  const q = query(
    collection(db, "courses"),
    where("schoolId", "==", schoolId),
    where("active", "==", true)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Course));
}

export async function createCourse(
  data: Omit<Course, "id" | "createdAt">
): Promise<string> {
  const ref = await addDoc(collection(db, "courses"), {
    ...data,
    createdAt: Timestamp.now(),
  });
  return ref.id;
}

export async function updateCourse(
  courseId: string,
  data: Partial<Pick<Course, "active" | "coordinatorId" | "name">>
): Promise<void> {
  await updateDoc(doc(db, "courses", courseId), data);
}
