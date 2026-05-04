"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { getThesis, updateThesisStatus } from "@/lib/firestore/theses";
import { createSubmission, getNextVersion, getSubmissionsByThesis } from "@/lib/firestore/submissions";
import { uploadThesisDocument } from "@/lib/supabase";
import { createNotificationsBulk } from "@/lib/firestore/notifications";
import { getGroup } from "@/lib/firestore/groups";
import { Thesis, Submission, STAGE_LABELS } from "@/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { StatusBadge } from "@/components/thesis/StatusBadge";
import { Skeleton } from "@/components/ui/skeleton";
import { Upload, FileText, CheckCircle, Clock } from "lucide-react";
import { toast } from "sonner";

function getSubmissionActionLabel(stage: Thesis["currentStage"]) {
  if (stage === "pre_oral") return "Submit Pre-Oral Paper";
  if (stage === "final_oral") return "Submit Final Oral Paper";
  if (stage === "manuscript") return "Submit Final Manuscript";
  return "Submit Proposal Paper";
}

function getStageUploadDescription(stage: Thesis["currentStage"]) {
  if (stage === "pre_oral") {
    return "Upload the revised PDF for the Pre-Oral Defense stage. This should reflect updates made after proposal approval and adviser feedback.";
  }
  if (stage === "final_oral") {
    return "Upload the revised PDF for the Final Oral Defense stage. Previous stage files are preserved as separate versions.";
  }
  if (stage === "manuscript") {
    return "Upload the final manuscript PDF for the last submission stage.";
  }
  return "Upload a PDF document for this stage. Previous versions are preserved.";
}

function getBlockedStageMessage(stageStatus: Thesis["stageStatus"]) {
  switch (stageStatus) {
    case "submitted":
      return "Your latest submission is waiting for adviser review.";
    case "under_review":
      return "Your adviser is currently reviewing the paper.";
    case "scheduled":
      return "Your defense is already scheduled. Wait for the scheduled review to finish.";
    case "evaluated":
      return "Your defense has already been evaluated. Wait for the admin decision for this stage.";
    case "approved":
      return "This stage has already been approved. Wait for the next stage to open.";
    case "completed":
      return "Your thesis workflow has already been completed.";
    case "rejected":
      return "This stage was rejected. Please contact your adviser or admin for next steps.";
    default:
      return "Submissions are not open right now.";
  }
}

export default function SubmitPage() {
  const params = useParams();
  const thesisId = params.thesisId as string;
  const router = useRouter();
  const { tmsUser } = useAuth();

  const [thesis, setThesis] = useState<Thesis | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    getThesis(thesisId).then(setThesis);
    getSubmissionsByThesis(thesisId).then(setSubmissions);
  }, [thesisId]);

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!file || !thesis || !tmsUser) return;

    setUploading(true);
    setProgress(20);

    try {
      const version = await getNextVersion(thesisId, thesis.currentStage);
      setProgress(40);

      const { path, error: uploadError } = await uploadThesisDocument(
        thesisId,
        thesis.currentStage,
        version,
        file
      );

      if (uploadError) throw new Error(uploadError);
      setProgress(70);

      await createSubmission({
        thesisId,
        stage: thesis.currentStage,
        fileUrl: path,
        fileName: file.name,
        version,
        submittedBy: tmsUser.uid,
      });
      setProgress(85);

      await updateThesisStatus(thesisId, "submitted");

      // Notify adviser if assigned
      const group = await getGroup(thesis.groupId);
      if (group?.adviserId) {
        await createNotificationsBulk(
          [group.adviserId],
          "submission",
          `New submission for "${thesis.title}" — ${STAGE_LABELS[thesis.currentStage]}`,
          thesisId
        );
      }

      setProgress(100);
      toast.success("Document submitted successfully!");
      router.push(`/student/thesis/${thesisId}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Upload failed.";
      toast.error(msg);
    } finally {
      setUploading(false);
      setProgress(0);
    }
  }

  if (!thesis) return <Skeleton className="h-64 w-full max-w-2xl" />;

  const canSubmit = thesis.stageStatus === "draft" || thesis.stageStatus === "revision_required";
  const submissionActionLabel = getSubmissionActionLabel(thesis.currentStage);
  const stageUploadDescription = getStageUploadDescription(thesis.currentStage);
  const blockedStageMessage = getBlockedStageMessage(thesis.stageStatus);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">{submissionActionLabel}</h1>
        <p className="text-slate-500 mt-1">
          {thesis.title} · {STAGE_LABELS[thesis.currentStage]}
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">{STAGE_LABELS[thesis.currentStage]}</CardTitle>
            <StatusBadge status={thesis.stageStatus} />
          </div>
          <CardDescription>
            {stageUploadDescription}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!canSubmit ? (
            <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-lg">
              <Clock className="w-5 h-5 text-slate-400" />
              <div>
                <p className="text-sm text-slate-700 font-medium">
                  {STAGE_LABELS[thesis.currentStage]} is currently closed for submission.
                </p>
                <p className="text-sm text-slate-600">
                  {blockedStageMessage} Current status:{" "}
                  <span className="font-medium capitalize">{thesis.stageStatus.replace("_", " ")}</span>
                </p>
              </div>
            </div>
          ) : (
            <form onSubmit={handleUpload} className="space-y-4">
              <div
                className="border-2 border-dashed border-slate-200 rounded-lg p-8 text-center hover:border-blue-400 transition cursor-pointer"
                onClick={() => document.getElementById("file-input")?.click()}
              >
                {file ? (
                  <div className="flex items-center justify-center gap-2 text-blue-600">
                    <FileText className="w-5 h-5" />
                    <span className="text-sm font-medium">{file.name}</span>
                    <span className="text-xs text-slate-400">
                      ({(file.size / 1024 / 1024).toFixed(2)} MB)
                    </span>
                  </div>
                ) : (
                  <div>
                    <Upload className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="text-sm text-slate-500">
                      Click to select a PDF file
                    </p>
                    <p className="text-xs text-slate-400 mt-1">PDF only, max 50MB</p>
                  </div>
                )}
              </div>
              <input
                id="file-input"
                type="file"
                accept=".pdf"
                className="hidden"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />

              {uploading && (
                <div className="space-y-1">
                  <Progress value={progress} className="h-2" />
                  <p className="text-xs text-slate-500 text-center">Uploading...</p>
                </div>
              )}

              <Button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-500"
                disabled={!file || uploading}
              >
                {submissionActionLabel}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>

      {/* Past submissions */}
      {submissions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Submission History</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {submissions.map((s) => (
              <div
                key={s.id}
                className="flex items-center justify-between p-3 border rounded-lg"
              >
                <div className="flex items-center gap-3">
                  {s.status === "approved" ? (
                    <CheckCircle className="w-4 h-4 text-green-500" />
                  ) : (
                    <FileText className="w-4 h-4 text-slate-400" />
                  )}
                  <div>
                    <p className="text-sm font-medium">{s.fileName}</p>
                    <p className="text-xs text-slate-500">
                      Version {s.version} &middot;{" "}
                      {STAGE_LABELS[s.stage]}
                    </p>
                  </div>
                </div>
                <StatusBadge status={s.status as never} />
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
