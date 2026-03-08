import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  updateDoc,
  query,
  where,
  orderBy,
  Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Submission, ThesisStage } from "@/types";

export async function createSubmission(
  data: Omit<Submission, "id" | "submittedAt" | "status" | "adviserFeedback">
): Promise<string> {
  const ref = await addDoc(collection(db, "submissions"), {
    ...data,
    status: "pending",
    adviserFeedback: null,
    submittedAt: Timestamp.now(),
  });
  return ref.id;
}

export async function getSubmissionsByThesis(
  thesisId: string,
  stage?: ThesisStage
): Promise<Submission[]> {
  let q = query(
    collection(db, "submissions"),
    where("thesisId", "==", thesisId),
    orderBy("submittedAt", "desc")
  );

  if (stage) {
    q = query(
      collection(db, "submissions"),
      where("thesisId", "==", thesisId),
      where("stage", "==", stage),
      orderBy("submittedAt", "desc")
    );
  }

  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Submission));
}

export async function getLatestSubmission(
  thesisId: string,
  stage: ThesisStage
): Promise<Submission | null> {
  const submissions = await getSubmissionsByThesis(thesisId, stage);
  return submissions.length > 0 ? submissions[0] : null;
}

export async function getNextVersion(
  thesisId: string,
  stage: ThesisStage
): Promise<number> {
  const submissions = await getSubmissionsByThesis(thesisId, stage);
  return submissions.length + 1;
}

export async function updateSubmissionStatus(
  submissionId: string,
  status: Submission["status"],
  adviserFeedback?: string
): Promise<void> {
  const updates: Partial<Submission> = { status };
  if (adviserFeedback !== undefined) updates.adviserFeedback = adviserFeedback;
  await updateDoc(doc(db, "submissions", submissionId), updates);
}
