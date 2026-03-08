import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  orderBy,
  Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Comment } from "@/types";

export async function addComment(
  thesisId: string,
  submissionId: string,
  authorId: string,
  text: string
): Promise<string> {
  const ref = await addDoc(collection(db, "comments"), {
    thesisId,
    submissionId,
    authorId,
    text,
    createdAt: Timestamp.now(),
  });
  return ref.id;
}

export async function getCommentsBySubmission(
  submissionId: string
): Promise<Comment[]> {
  const q = query(
    collection(db, "comments"),
    where("submissionId", "==", submissionId),
    orderBy("createdAt", "asc")
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Comment));
}
