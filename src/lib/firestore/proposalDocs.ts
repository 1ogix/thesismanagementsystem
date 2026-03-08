import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { ProposalDocument, InlineComment } from "@/types";

/**
 * Get the proposal document for a thesis.
 * Returns null if the student hasn't started writing yet.
 */
export async function getProposalDocument(
  thesisId: string
): Promise<ProposalDocument | null> {
  const snap = await getDoc(doc(db, "proposalDocuments", thesisId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as ProposalDocument;
}

/**
 * Upsert (auto-save) the proposal document content.
 * Uses thesisId as the document ID so there is always exactly one per thesis.
 */
export async function saveProposalDocument(
  thesisId: string,
  content: object,
  userId: string
): Promise<void> {
  const ref = doc(db, "proposalDocuments", thesisId);
  const existing = await getDoc(ref);
  await setDoc(
    ref,
    {
      thesisId,
      content,
      version: existing.exists() ? (existing.data().version ?? 1) : 1,
      lastEditedBy: userId,
      lastEditedAt: Timestamp.now(),
    },
    { merge: true }
  );
}

/**
 * Get all inline comments for a thesis (both resolved and unresolved).
 */
export async function getInlineComments(
  thesisId: string
): Promise<InlineComment[]> {
  const q = query(
    collection(db, "inlineComments"),
    where("thesisId", "==", thesisId)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as InlineComment));
}

/**
 * Add an inline comment. The commentId is the UUID already embedded as a
 * mark attribute in the TipTap document JSON.
 */
export async function addInlineComment(
  thesisId: string,
  authorId: string,
  authorName: string,
  text: string,
  commentId: string
): Promise<void> {
  await setDoc(doc(db, "inlineComments", commentId), {
    thesisId,
    authorId,
    authorName,
    text,
    resolved: false,
    createdAt: Timestamp.now(),
  });
}

/**
 * Mark a comment as resolved.
 */
export async function resolveInlineComment(commentId: string): Promise<void> {
  await updateDoc(doc(db, "inlineComments", commentId), { resolved: true });
}

/**
 * Hard-delete an inline comment from Firestore.
 */
export async function deleteInlineComment(commentId: string): Promise<void> {
  await deleteDoc(doc(db, "inlineComments", commentId));
}
