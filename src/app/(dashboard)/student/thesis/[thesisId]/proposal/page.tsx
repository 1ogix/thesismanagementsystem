"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { getThesis, updateThesisStatus } from "@/lib/firestore/theses";
import { getGroup } from "@/lib/firestore/groups";
import { createNotificationsBulk } from "@/lib/firestore/notifications";
import { ProposalEditor } from "@/components/editor/ProposalEditor";
import { Thesis, Group } from "@/types";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/thesis/StatusBadge";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";

export default function ProposalEditorPage() {
  const params = useParams();
  const thesisId = params.thesisId as string;
  const { tmsUser } = useAuth();

  const [thesis, setThesis] = useState<Thesis | null>(null);
  const [group, setGroup] = useState<Group | null>(null);

  useEffect(() => {
    getThesis(thesisId).then((t) => {
      setThesis(t);
      if (t) getGroup(t.groupId).then(setGroup);
    });
  }, [thesisId]);

  async function handleSubmitForReview() {
    if (!thesis || !group) return;

    await updateThesisStatus(thesisId, "submitted");
    setThesis((prev) => (prev ? { ...prev, stageStatus: "submitted" } : prev));

    const recipients: string[] = [];
    if (group.adviserId) recipients.push(group.adviserId);

    if (recipients.length > 0) {
      await createNotificationsBulk(
        recipients,
        "submission",
        `A new proposal document has been submitted for "${thesis.title}". Please review it.`,
        thesisId
      );
    }

    toast.success("Proposal submitted for review!");
  }

  if (!thesis || !tmsUser) {
    return <Skeleton className="h-64 w-full max-w-5xl" />;
  }

  // Only proposal stage should access this page
  if (thesis.currentStage !== "proposal") {
    return (
      <div className="max-w-2xl mx-auto text-center py-16">
        <p className="text-slate-500">
          The inline editor is only available for the Proposal stage.
        </p>
        <Link href={`/student/thesis/${thesisId}`} className="mt-4 inline-block">
          <Button variant="outline">Back to Thesis</Button>
        </Link>
      </div>
    );
  }

  const isReadOnly =
    thesis.stageStatus === "submitted" ||
    thesis.stageStatus === "under_review" ||
    thesis.stageStatus === "scheduled";

  return (
    <div className="max-w-5xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href={`/student/thesis/${thesisId}`}>
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-1" /> Back
            </Button>
          </Link>
          <div>
            <h1 className="text-lg font-bold text-slate-900 truncate max-w-md">
              {thesis.title}
            </h1>
            <p className="text-xs text-slate-500">Proposal / Title Defense</p>
          </div>
        </div>
        <StatusBadge status={thesis.stageStatus} />
      </div>

      {/* Editor */}
      <ProposalEditor
        thesisId={thesisId}
        mode="edit"
        userId={tmsUser.uid}
        userName={tmsUser.displayName}
        readOnly={isReadOnly}
        onSubmitForReview={isReadOnly ? undefined : handleSubmitForReview}
      />
    </div>
  );
}
