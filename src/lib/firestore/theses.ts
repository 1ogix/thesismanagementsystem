import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
  Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Thesis, ThesisStage, StageStatus } from "@/types";

export async function createThesis(
  groupId: string,
  title: string,
  abstract: string
): Promise<string> {
  const ref = await addDoc(collection(db, "theses"), {
    groupId,
    title,
    abstract,
    currentStage: "proposal" as ThesisStage,
    stageStatus: "draft" as StageStatus,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  });
  return ref.id;
}

export async function getThesis(thesisId: string): Promise<Thesis | null> {
  const snap = await getDoc(doc(db, "theses", thesisId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as Thesis;
}

export async function getThesisByGroup(groupId: string): Promise<Thesis | null> {
  const q = query(collection(db, "theses"), where("groupId", "==", groupId));
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const d = snap.docs[0];
  return { id: d.id, ...d.data() } as Thesis;
}

export async function getAllTheses(): Promise<Thesis[]> {
  const snap = await getDocs(collection(db, "theses"));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Thesis));
}

export async function updateThesisStatus(
  thesisId: string,
  stageStatus: StageStatus
): Promise<void> {
  await updateDoc(doc(db, "theses", thesisId), {
    stageStatus,
    updatedAt: Timestamp.now(),
  });
}

export async function advanceThesisStage(thesisId: string): Promise<void> {
  const thesis = await getThesis(thesisId);
  if (!thesis) return;

  const stageOrder: ThesisStage[] = [
    "proposal",
    "pre_oral",
    "final_oral",
    "manuscript",
  ];
  const currentIndex = stageOrder.indexOf(thesis.currentStage);
  if (currentIndex === stageOrder.length - 1) return;

  const nextStage = stageOrder[currentIndex + 1];
  await updateDoc(doc(db, "theses", thesisId), {
    currentStage: nextStage,
    stageStatus: "draft" as StageStatus,
    updatedAt: Timestamp.now(),
  });
}

export async function updateThesis(
  thesisId: string,
  data: Partial<Pick<Thesis, "title" | "abstract">>
): Promise<void> {
  await updateDoc(doc(db, "theses", thesisId), {
    ...data,
    updatedAt: Timestamp.now(),
  });
}

/**
 * Mark a thesis as fully completed (end of manuscript stage).
 */
export async function completeThesis(thesisId: string): Promise<void> {
  await updateDoc(doc(db, "theses", thesisId), {
    stageStatus: "completed" as StageStatus,
    updatedAt: Timestamp.now(),
  });
}

/**
 * Hard-delete the thesis Firestore document.
 * Caller is responsible for cleaning up Supabase storage files first.
 */
export async function deleteThesis(thesisId: string): Promise<void> {
  await deleteDoc(doc(db, "theses", thesisId));
}
