import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { PanelAssignment, Evaluation, ThesisStage } from "@/types";

export async function assignPanelMember(
  thesisId: string,
  panelMemberId: string,
  stage: ThesisStage,
  assignedBy: string
): Promise<string> {
  const ref = await addDoc(collection(db, "panelAssignments"), {
    thesisId,
    panelMemberId,
    stage,
    assignedBy,
    assignedAt: Timestamp.now(),
  });
  return ref.id;
}

export async function getPanelByThesis(
  thesisId: string,
  stage?: ThesisStage
): Promise<PanelAssignment[]> {
  const constraints = [where("thesisId", "==", thesisId)];
  if (stage) constraints.push(where("stage", "==", stage));

  const q = query(collection(db, "panelAssignments"), ...constraints);
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as PanelAssignment));
}

export async function getThesesByPanel(
  panelMemberId: string
): Promise<PanelAssignment[]> {
  const q = query(
    collection(db, "panelAssignments"),
    where("panelMemberId", "==", panelMemberId)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as PanelAssignment));
}

export async function submitEvaluation(
  data: Omit<Evaluation, "id" | "submittedAt">
): Promise<string> {
  const ref = await addDoc(collection(db, "evaluations"), {
    ...data,
    submittedAt: Timestamp.now(),
  });
  return ref.id;
}

export async function getEvaluationsByThesis(
  thesisId: string,
  stage?: ThesisStage
): Promise<Evaluation[]> {
  const constraints = [where("thesisId", "==", thesisId)];
  if (stage) constraints.push(where("stage", "==", stage));

  const q = query(collection(db, "evaluations"), ...constraints);
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Evaluation));
}

export async function getEvaluationByPanel(
  thesisId: string,
  panelMemberId: string,
  stage: ThesisStage
): Promise<Evaluation | null> {
  const q = query(
    collection(db, "evaluations"),
    where("thesisId", "==", thesisId),
    where("panelMemberId", "==", panelMemberId),
    where("stage", "==", stage)
  );
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const d = snap.docs[0];
  return { id: d.id, ...d.data() } as Evaluation;
}
