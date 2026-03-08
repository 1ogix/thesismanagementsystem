import {
  collection,
  addDoc,
  getDocs,
  updateDoc,
  doc,
  query,
  where,
  Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { AdviserApplication, AdviserApplicationStatus } from "@/types";

export async function applyAsAdviser(
  thesisId: string,
  adviserId: string
): Promise<string> {
  const ref = await addDoc(collection(db, "adviserApplications"), {
    thesisId,
    adviserId,
    type: "volunteer",
    status: "pending",
    appliedAt: Timestamp.now(),
  });
  return ref.id;
}

export async function assignAdviserByAdmin(
  thesisId: string,
  adviserId: string
): Promise<string> {
  const ref = await addDoc(collection(db, "adviserApplications"), {
    thesisId,
    adviserId,
    type: "assigned",
    status: "approved",
    appliedAt: Timestamp.now(),
  });
  return ref.id;
}

export async function updateApplicationStatus(
  applicationId: string,
  status: AdviserApplicationStatus
): Promise<void> {
  await updateDoc(doc(db, "adviserApplications", applicationId), { status });
}

export async function getApplicationsByThesis(
  thesisId: string
): Promise<AdviserApplication[]> {
  const q = query(
    collection(db, "adviserApplications"),
    where("thesisId", "==", thesisId)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as AdviserApplication));
}

export async function getApplicationsByAdviser(
  adviserId: string
): Promise<AdviserApplication[]> {
  const q = query(
    collection(db, "adviserApplications"),
    where("adviserId", "==", adviserId)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as AdviserApplication));
}

export async function hasAdviserApplied(
  thesisId: string,
  adviserId: string
): Promise<boolean> {
  const q = query(
    collection(db, "adviserApplications"),
    where("thesisId", "==", thesisId),
    where("adviserId", "==", adviserId)
  );
  const snap = await getDocs(q);
  return !snap.empty;
}
