"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  getThesis,
  updateThesisStatus,
  advanceThesisStage,
  completeThesis,
  deleteThesis,
} from "@/lib/firestore/theses";
import { getUsersByCapability } from "@/lib/firestore/users";
import { getGroup, updateGroupStatus } from "@/lib/firestore/groups";
import { getSubmissionsByThesis } from "@/lib/firestore/submissions";
import { getEvaluationsByThesis } from "@/lib/firestore/panel";
import {
  assignAdviserByAdmin,
  getApplicationsByThesis,
  updateApplicationStatus,
} from "@/lib/firestore/adviser";
import { assignAdviserToGroup } from "@/lib/firestore/groups";
import { getSignedUrl, deleteThesisDocuments } from "@/lib/supabase";
import { createNotificationsBulk } from "@/lib/firestore/notifications";
import {
  Thesis,
  Group,
  Submission,
  Evaluation,
  STAGE_LABELS,
  StageStatus,
  TmsUser,
} from "@/types";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/thesis/StatusBadge";
import { StageTimeline } from "@/components/thesis/StageTimeline";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  FileText,
  ExternalLink,
  ArrowLeft,
  ChevronRight,
  CheckCircle,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

export default function AdminThesisDetailPage() {
  const params = useParams();
  const router = useRouter();
  const thesisId = params.thesisId as string;

  const [thesis, setThesis] = useState<Thesis | null>(null);
  const [group, setGroup] = useState<Group | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [advisers, setAdvisers] = useState<TmsUser[]>([]);
  const [selectedAdviser, setSelectedAdviser] = useState("");
  const [applications, setApplications] = useState<
    { id: string; adviserId: string; adviserName: string }[]
  >([]);
  const [updating, setUpdating] = useState(false);
  const [assigningAdviser, setAssigningAdviser] = useState(false);
  const [manualStatus, setManualStatus] = useState<StageStatus>("draft");

  useEffect(() => {
    getThesis(thesisId).then((t) => {
      setThesis(t);
      if (t) getGroup(t.groupId).then(setGroup);
    });
    getSubmissionsByThesis(thesisId).then(setSubmissions);
    getEvaluationsByThesis(thesisId).then(setEvaluations);
    getUsersByCapability("adviser").then(setAdvisers);
  }, [thesisId]);

  useEffect(() => {
    if (group?.adviserId || advisers.length === 0) {
      setApplications([]);
      return;
    }

    getApplicationsByThesis(thesisId).then((apps) => {
      const pending = apps.filter((a) => a.status === "pending");
      setApplications(
        pending.map((a) => {
          const adviser = advisers.find((user) => user.uid === a.adviserId);
          return {
            id: a.id,
            adviserId: a.adviserId,
            adviserName: adviser?.displayName ?? a.adviserId,
          };
        }),
      );
    });
  }, [advisers, group?.adviserId, thesisId]);

  useEffect(() => {
    if (thesis) {
      setManualStatus(thesis.stageStatus);
    }
  }, [thesis]);

  async function openDocument(path: string) {
    const { url, error } = await getSignedUrl(path);
    if (error || !url) {
      toast.error("Failed to open.");
      return;
    }
    window.open(url, "_blank");
  }

  async function handleStatusChange(status: StageStatus) {
    if (!thesis || !group) return;
    setUpdating(true);
    try {
      await updateThesisStatus(thesisId, status);
      setThesis((prev) => (prev ? { ...prev, stageStatus: status } : prev));
      await createNotificationsBulk(
        group.members,
        "approval",
        `Your thesis "${thesis.title}" status updated to: ${status.replace("_", " ")}`,
        thesisId,
      );
      toast.success("Status updated.");
    } catch {
      toast.error("Failed to update status.");
    } finally {
      setUpdating(false);
    }
  }

  async function handleAdvanceStage() {
    if (!thesis || !group) return;
    setUpdating(true);
    try {
      await advanceThesisStage(thesisId);
      const updated = await getThesis(thesisId);
      setThesis(updated);
      if (updated) {
        await createNotificationsBulk(
          group.members,
          "approval",
          `Congratulations! Your thesis "${thesis.title}" has advanced to ${STAGE_LABELS[updated.currentStage]}`,
          thesisId,
        );
      }
      toast.success("Advanced to next stage.");
    } catch {
      toast.error("Failed to advance stage.");
    } finally {
      setUpdating(false);
    }
  }

  async function handleCompleteThesis() {
    if (!thesis || !group) return;
    setUpdating(true);
    try {
      await completeThesis(thesisId);
      await updateGroupStatus(group.id, "completed");
      setThesis((prev) =>
        prev ? { ...prev, stageStatus: "completed" } : prev,
      );
      const recipients = [
        ...group.members,
        ...(group.adviserId ? [group.adviserId] : []),
      ];
      await createNotificationsBulk(
        recipients,
        "approval",
        `🎉 Congratulations! Thesis "${thesis.title}" has been successfully completed.`,
        thesisId,
      );
      toast.success("Thesis marked as completed!");
    } catch {
      toast.error("Failed to complete thesis.");
    } finally {
      setUpdating(false);
    }
  }

  async function handleDeleteThesis() {
    setUpdating(true);
    try {
      await deleteThesisDocuments(thesisId);
      await deleteThesis(thesisId);
      toast.success("Thesis deleted.");
      router.push("/admin/theses");
    } catch {
      toast.error("Failed to delete thesis.");
      setUpdating(false);
    }
  }

  async function handleAssignAdviser() {
    if (!thesis || !selectedAdviser) {
      toast.error("Select an adviser.");
      return;
    }

    setAssigningAdviser(true);
    try {
      const targetGroup = group ?? (await getGroup(thesis.groupId));
      if (!targetGroup) {
        toast.error("Group not found for this thesis.");
        return;
      }

      await assignAdviserByAdmin(thesisId, selectedAdviser);
      await assignAdviserToGroup(targetGroup.id, selectedAdviser);

      const adviserUser = advisers.find(
        (adviser) => adviser.uid === selectedAdviser,
      );
      await createNotificationsBulk(
        [...targetGroup.members, selectedAdviser],
        "assignment",
        `Adviser ${adviserUser?.displayName ?? ""} has been assigned to "${thesis.title}"`,
        thesisId,
      );

      setGroup({ ...targetGroup, adviserId: selectedAdviser });
      setSelectedAdviser("");
      setApplications([]);
      toast.success("Adviser assigned successfully.");
    } catch {
      toast.error("Failed to assign adviser.");
    } finally {
      setAssigningAdviser(false);
    }
  }

  async function handleApproveVolunteer(appId: string, adviserId: string) {
    if (!thesis) return;

    setAssigningAdviser(true);
    try {
      const targetGroup = group ?? (await getGroup(thesis.groupId));
      if (!targetGroup) {
        toast.error("Group not found for this thesis.");
        return;
      }

      await updateApplicationStatus(appId, "approved");
      await assignAdviserToGroup(targetGroup.id, adviserId);

      const adviserUser = advisers.find((adviser) => adviser.uid === adviserId);
      await createNotificationsBulk(
        [...targetGroup.members, adviserId],
        "assignment",
        `Adviser ${adviserUser?.displayName ?? ""} approved for "${thesis.title}"`,
        thesisId,
      );

      setGroup({ ...targetGroup, adviserId });
      setApplications([]);
      setSelectedAdviser("");
      toast.success("Volunteer approved.");
    } catch {
      toast.error("Failed to approve volunteer.");
    } finally {
      setAssigningAdviser(false);
    }
  }

  const avgScore =
    evaluations.length > 0
      ? Math.round(
          evaluations.reduce((sum, e) => sum + e.overallScore, 0) /
            evaluations.length,
        )
      : null;
  const currentAdviser = advisers.find(
    (adviser) => adviser.uid === group?.adviserId,
  );

  if (!thesis) return <Skeleton className="h-64 w-full max-w-4xl" />;

  const currentStageSubmissions = submissions.filter(
    (submission) => submission.stage === thesis.currentStage,
  );
  const hasCurrentStageSubmission = currentStageSubmissions.length > 0;
  const latestCurrentStageSubmission = currentStageSubmissions[0] ?? null;
  const invalidWorkflowState =
    !hasCurrentStageSubmission &&
    !["draft", "revision_required"].includes(thesis.stageStatus);

  function getWorkflowGuidance() {
    if (invalidWorkflowState) {
      return `No ${STAGE_LABELS[thesis.currentStage]} submission exists yet, but this thesis is marked as ${thesis.stageStatus.replace("_", " ")}. The recommended fix is to reset this stage to Draft so the student can submit their paper.`;
    }

    if (!hasCurrentStageSubmission) {
      return `Waiting for the student to submit a PDF for ${STAGE_LABELS[thesis.currentStage]}.`;
    }

    if (thesis.stageStatus === "submitted") {
      return "A student submission exists for this stage and is waiting for adviser review.";
    }

    if (thesis.stageStatus === "revision_required") {
      return "The adviser requested revision. The student should upload a revised PDF for the current stage.";
    }

    if (thesis.stageStatus === "scheduled") {
      return "This stage has already been scheduled. The next action normally happens after the defense or review event.";
    }

    if (thesis.stageStatus === "evaluated") {
      return "Panel evaluation has been recorded. Admin may decide whether to advance or return the thesis for revision.";
    }

    if (thesis.stageStatus === "approved") {
      return thesis.currentStage === "manuscript"
        ? "This thesis is ready to be completed."
        : "This stage is approved and ready to advance to the next stage.";
    }

    if (thesis.stageStatus === "under_review") {
      return "This status is reserved for exceptional manual handling. In the normal flow, adviser review begins after a student submission.";
    }

    if (thesis.stageStatus === "rejected") {
      return "This stage is rejected. Use manual override only if you intentionally want to reopen or change the workflow state.";
    }

    if (thesis.stageStatus === "completed") {
      return "This thesis has already completed the workflow.";
    }

    return "Student submission is open for this stage.";
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/admin/theses">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="w-4 h-4 mr-1" /> Back
          </Button>
        </Link>
        <h1 className="text-xl font-bold text-slate-900 truncate">
          {thesis.title}
        </h1>
      </div>

      <Card>
        <CardContent className="pt-6">
          <StageTimeline
            currentStage={thesis.currentStage}
            stageStatus={thesis.stageStatus}
          />
        </CardContent>
      </Card>

      {/* Admin controls */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Admin Controls</CardTitle>
            <StatusBadge status={thesis.stageStatus} />
          </div>
          <CardDescription>
            Manage this thesis&apos; stage and status.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 space-y-2">
            <p className="text-sm font-medium text-slate-800">Workflow Guidance</p>
            <p className="text-sm text-slate-600">{getWorkflowGuidance()}</p>
            {latestCurrentStageSubmission && (
              <p className="text-xs text-slate-500">
                Latest current-stage file: {latestCurrentStageSubmission.fileName} · v
                {latestCurrentStageSubmission.version} · {latestCurrentStageSubmission.status.replace("_", " ")}
              </p>
            )}
          </div>

          {invalidWorkflowState && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 space-y-3">
              <div>
                <p className="text-sm font-medium text-amber-800">
                  Invalid workflow state detected
                </p>
                <p className="text-sm text-amber-700">
                  This stage is blocking the student even though no submission exists yet for
                  {` ${STAGE_LABELS[thesis.currentStage]}`}. Resetting to Draft will reopen the stage for student submission.
                </p>
              </div>
              <Button
                size="sm"
                className="bg-amber-600 hover:bg-amber-500"
                onClick={() => handleStatusChange("draft")}
                disabled={updating}
              >
                Reset Stage to Draft
              </Button>
            </div>
          )}

          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-medium text-slate-800">
                Adviser Assignment
              </p>
              {group?.adviserId ? (
                <Badge
                  variant="outline"
                  className="rounded-full border-emerald-200 bg-emerald-50 px-3 py-1 text-emerald-700"
                >
                  {currentAdviser?.displayName ?? "Adviser assigned"}
                </Badge>
              ) : (
                <Badge
                  variant="outline"
                  className="rounded-full border-amber-200 bg-amber-50 px-3 py-1 text-amber-700"
                >
                  No adviser assigned
                </Badge>
              )}
            </div>

            {!group?.adviserId && (
              <>
                {applications.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-slate-700">
                      Volunteer Applications
                    </p>
                    {applications.map((app) => (
                      <div
                        key={app.id}
                        className="flex items-center justify-between gap-3 rounded-lg border border-yellow-200 bg-yellow-50 p-3"
                      >
                        <p className="text-sm font-medium text-slate-900">
                          {app.adviserName}
                        </p>
                        <Button
                          size="sm"
                          className="bg-green-600 hover:bg-green-500"
                          onClick={() =>
                            handleApproveVolunteer(app.id, app.adviserId)
                          }
                          disabled={assigningAdviser}
                        >
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Approve
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="space-y-1">
                  <label className="text-sm font-medium">Assign Adviser</label>
                  <Select
                    onValueChange={(value) => setSelectedAdviser(value ?? "")}
                    value={selectedAdviser}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Choose an adviser..." />
                    </SelectTrigger>
                    <SelectContent>
                      {advisers.map((adviser) => (
                        <SelectItem key={adviser.uid} value={adviser.uid}>
                          {adviser.displayName} — {adviser.department}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Button
                  className="bg-blue-600 hover:bg-blue-500"
                  onClick={handleAssignAdviser}
                  disabled={assigningAdviser || !selectedAdviser}
                >
                  Assign Adviser
                </Button>
              </>
            )}
          </div>

          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 space-y-3">
            <div>
              <p className="text-sm font-medium text-slate-800">Manual Status Override</p>
              <p className="text-xs text-slate-500">
                Use this only when you need to recover from inconsistent data or intentionally override the normal student/adviser workflow.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Select
                onValueChange={(value) => setManualStatus(value as StageStatus)}
                value={manualStatus}
              >
                <SelectTrigger className="w-52">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(
                    [
                      "draft",
                      "submitted",
                      "under_review",
                      "scheduled",
                      "evaluated",
                      "approved",
                      "revision_required",
                      "rejected",
                    ] as StageStatus[]
                  ).map((status) => (
                    <SelectItem key={status} value={status}>
                      {status.replace("_", " ")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <AlertDialog>
                <AlertDialogTrigger
                  disabled={updating || manualStatus === thesis.stageStatus}
                  className="inline-flex items-center justify-center gap-1 rounded-md border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-50 px-3 py-2 text-sm font-medium text-slate-900 transition-colors"
                >
                  Apply Manual Override
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Apply manual status override?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This bypasses the normal workflow and can create inconsistent data if used incorrectly.
                      The thesis will be changed from {thesis.stageStatus.replace("_", " ")} to {manualStatus.replace("_", " ")}.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => handleStatusChange(manualStatus)}
                    >
                      Confirm Override
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>

          {thesis.stageStatus === "approved" &&
            thesis.currentStage !== "manuscript" && (
              <Button
                onClick={handleAdvanceStage}
                disabled={updating}
                className="bg-green-600 hover:bg-green-500 w-full"
              >
                <ChevronRight className="w-4 h-4 mr-1" />
                Advance to Next Stage (
                {
                  STAGE_LABELS[
                    ["proposal", "pre_oral", "final_oral", "manuscript"][
                      [
                        "proposal",
                        "pre_oral",
                        "final_oral",
                        "manuscript",
                      ].indexOf(thesis.currentStage) + 1
                    ] as keyof typeof STAGE_LABELS
                  ]
                }
                )
              </Button>
            )}

          {/* Complete Thesis — only when manuscript stage is approved */}
          {thesis.currentStage === "manuscript" &&
            thesis.stageStatus === "approved" && (
              <Button
                onClick={handleCompleteThesis}
                disabled={updating}
                className="bg-emerald-600 hover:bg-emerald-500 w-full"
              >
                <CheckCircle className="w-4 h-4 mr-1" />
                Mark Thesis as Completed
              </Button>
            )}

          {/* Completed state badge */}
          {thesis.stageStatus === "completed" && (
            <div className="flex items-center gap-2 text-emerald-600 font-semibold text-sm py-1">
              <CheckCircle className="w-4 h-4" />
              This thesis has been completed.
            </div>
          )}

          {/* Delete Thesis — always available to admin, behind confirmation */}
          <AlertDialog>
            <AlertDialogTrigger
              disabled={updating}
              className="w-full mt-1 inline-flex items-center justify-center gap-1 rounded-md bg-red-600 hover:bg-red-500 disabled:opacity-50 px-3 py-1.5 text-sm font-medium text-white transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              Delete Thesis
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete this thesis?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete the thesis record and all
                  uploaded PDF documents from storage. This action cannot be
                  undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDeleteThesis}
                  className="bg-red-600 hover:bg-red-500"
                >
                  Yes, delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <div className="text-sm text-slate-500">
            Group: {group?.name ?? "—"} · {group?.members.length ?? 0} members ·{" "}
            {avgScore !== null
              ? `Avg Score: ${avgScore}/100`
              : "Not yet evaluated"}
          </div>
        </CardContent>
      </Card>

      {/* Submissions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Submissions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {submissions.length === 0 ? (
            <p className="text-sm text-slate-400">No submissions yet.</p>
          ) : (
            submissions.map((s) => (
              <div
                key={s.id}
                className="flex items-center justify-between p-3 border rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <FileText className="w-4 h-4 text-slate-400" />
                  <div>
                    <p className="text-sm font-medium">{s.fileName}</p>
                    <p className="text-xs text-slate-500">
                      {STAGE_LABELS[s.stage]} · v{s.version}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge status={s.status as never} />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="w-7 h-7"
                    onClick={() => openDocument(s.fileUrl)}
                  >
                    <ExternalLink className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Evaluations summary */}
      {evaluations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Evaluations</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {evaluations.map((e) => (
              <div
                key={e.id}
                className="flex items-center justify-between p-3 border rounded-lg"
              >
                <div>
                  <p className="text-sm font-medium">
                    Panel Member:{" "}
                    {e.panelMemberName ?? `${e.panelMemberId.slice(0, 8)}...`}
                  </p>
                  <p className="text-xs text-slate-500">
                    {STAGE_LABELS[e.stage]}
                  </p>
                  {e.comments && (
                    <p className="text-xs text-slate-600 mt-1 italic">
                      &quot;{e.comments}&quot;
                    </p>
                  )}
                </div>
                <Badge
                  className="bg-blue-100 text-blue-700 border-blue-200"
                  variant="outline"
                >
                  {e.overallScore}/100
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
