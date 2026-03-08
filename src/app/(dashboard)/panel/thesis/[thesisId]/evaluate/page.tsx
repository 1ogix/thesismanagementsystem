"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { getThesis, updateThesisStatus } from "@/lib/firestore/theses";
import { submitEvaluation, getEvaluationByPanel } from "@/lib/firestore/panel";
import { getSubmissionsByThesis } from "@/lib/firestore/submissions";
import { getSignedUrl } from "@/lib/supabase";
import { getGroup } from "@/lib/firestore/groups";
import { createNotificationsBulk } from "@/lib/firestore/notifications";
import { Thesis, Submission, Evaluation, ThesisStage, STAGE_LABELS, EVALUATION_CRITERIA } from "@/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { FileText, ExternalLink, CheckCircle } from "lucide-react";
import { toast } from "sonner";

function ScoreInput({
  criterion, value, onChange, disabled,
}: {
  criterion: string; value: number; onChange: (v: number) => void; disabled: boolean;
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <Label className="text-sm">{criterion}</Label>
        <span className="text-sm font-semibold text-blue-600">{value}/100</span>
      </div>
      <input
        type="range"
        min={0}
        max={100}
        step={5}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        disabled={disabled}
        className="w-full accent-blue-600"
      />
    </div>
  );
}

export default function EvaluatePage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { tmsUser } = useAuth();

  const thesisId = params.thesisId as string;
  const stage = (searchParams.get("stage") ?? "proposal") as ThesisStage;

  const [thesis, setThesis] = useState<Thesis | null>(null);
  const [submission, setSubmission] = useState<Submission | null>(null);
  const [existingEval, setExistingEval] = useState<Evaluation | null>(null);
  const [grades, setGrades] = useState<Record<string, number>>({});
  const [comments, setComments] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const criteria = EVALUATION_CRITERIA[stage];

  useEffect(() => {
    getThesis(thesisId).then(setThesis);
    getSubmissionsByThesis(thesisId, stage).then((subs) => setSubmission(subs[0] ?? null));

    if (tmsUser) {
      getEvaluationByPanel(thesisId, tmsUser.uid, stage).then((ev) => {
        if (ev) {
          setExistingEval(ev);
          setGrades(ev.grades);
          setComments(ev.comments);
        } else {
          // Init scores to 70
          const init: Record<string, number> = {};
          EVALUATION_CRITERIA[stage].forEach((c) => { init[c] = 70; });
          setGrades(init);
        }
      });
    }
  }, [thesisId, stage, tmsUser]);

  async function openDocument() {
    if (!submission) return;
    const { url, error } = await getSignedUrl(submission.fileUrl);
    if (error || !url) { toast.error("Failed to open document."); return; }
    window.open(url, "_blank");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!tmsUser || !thesis) return;
    setSubmitting(true);

    const overallScore = Math.round(
      Object.values(grades).reduce((sum, v) => sum + v, 0) / criteria.length
    );

    try {
      await submitEvaluation({
        thesisId,
        panelMemberId: tmsUser.uid,
        stage,
        grades,
        overallScore,
        comments,
      });

      await updateThesisStatus(thesisId, "evaluated");

      const group = await getGroup(thesis.groupId);
      if (group) {
        await createNotificationsBulk(
          group.members,
          "evaluation",
          `Your thesis "${thesis.title}" has been evaluated for ${STAGE_LABELS[stage]}. Score: ${overallScore}/100`,
          thesisId
        );
      }

      toast.success(`Evaluation submitted. Overall score: ${overallScore}/100`);
      router.push("/panel");
    } catch {
      toast.error("Failed to submit evaluation.");
    } finally {
      setSubmitting(false);
    }
  }

  if (!thesis) return <Skeleton className="h-64 w-full max-w-2xl" />;

  const overallScore = criteria.length > 0
    ? Math.round(Object.values(grades).reduce((sum, v) => sum + v, 0) / criteria.length)
    : 0;

  const isReadOnly = !!existingEval;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Evaluation Form</h1>
        <p className="text-slate-500 mt-1">
          {thesis.title} — {STAGE_LABELS[stage]}
        </p>
      </div>

      {isReadOnly && (
        <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
          <CheckCircle className="w-4 h-4 shrink-0" />
          You have already submitted this evaluation. Score: {existingEval?.overallScore}/100
        </div>
      )}

      {/* Document viewer */}
      {submission && (
        <Card>
          <CardContent className="flex items-center justify-between py-4">
            <div className="flex items-center gap-3">
              <FileText className="w-5 h-5 text-slate-400" />
              <div>
                <p className="text-sm font-medium">{submission.fileName}</p>
                <p className="text-xs text-slate-500">Version {submission.version}</p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={openDocument}>
              <ExternalLink className="w-4 h-4 mr-1" />
              Open PDF
            </Button>
          </CardContent>
        </Card>
      )}

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Scoring Rubric</CardTitle>
            <CardDescription>Rate each criterion from 0–100.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {criteria.map((criterion) => (
              <ScoreInput
                key={criterion}
                criterion={criterion}
                value={grades[criterion] ?? 70}
                onChange={(v) => setGrades((p) => ({ ...p, [criterion]: v }))}
                disabled={isReadOnly}
              />
            ))}

            <Separator />

            <div className="flex items-center justify-between py-2">
              <span className="font-semibold text-slate-700">Overall Score</span>
              <span className="text-2xl font-bold text-blue-600">{overallScore}/100</span>
            </div>

            <div className="space-y-1">
              <Label>Comments / Recommendations</Label>
              <Textarea
                placeholder="Write your evaluation comments here..."
                rows={4}
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                disabled={isReadOnly}
              />
            </div>

            {!isReadOnly && (
              <Button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-500"
                disabled={submitting}
              >
                Submit Evaluation
              </Button>
            )}
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
