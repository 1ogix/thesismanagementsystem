"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { getThesis, updateThesisStatus } from "@/lib/firestore/theses";
import { getSubmissionsByThesis, updateSubmissionStatus } from "@/lib/firestore/submissions";
import { getEvaluationsByThesis } from "@/lib/firestore/panel";
import { getSchedulesByThesis } from "@/lib/firestore/schedules";
import { getUsersByIds } from "@/lib/firestore/users";
import { getSignedUrl } from "@/lib/supabase";
import { getGroup } from "@/lib/firestore/groups";
import { createNotificationsBulk } from "@/lib/firestore/notifications";
import { Thesis, Submission, Evaluation, DefenseSchedule, TmsUser, Group, STAGE_LABELS, EVALUATION_CRITERIA } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { StatusBadge } from "@/components/thesis/StatusBadge";
import { StageTimeline } from "@/components/thesis/StageTimeline";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { FileText, ExternalLink, CheckCircle, RotateCcw, Star, CalendarDays } from "lucide-react";
import { toast } from "sonner";

export default function AdviserThesisPage() {
  const params = useParams();
  const thesisId = params.thesisId as string;

  const [thesis, setThesis] = useState<Thesis | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [group, setGroup] = useState<Group | null>(null);
  const [schedules, setSchedules] = useState<DefenseSchedule[]>([]);
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [panelUsers, setPanelUsers] = useState<Record<string, TmsUser>>({});
  const [feedback, setFeedback] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState<Record<string, boolean>>({});

  useEffect(() => {
    getThesis(thesisId).then((t) => {
      setThesis(t);
      if (t) getGroup(t.groupId).then(setGroup);
    });
    getSubmissionsByThesis(thesisId).then(setSubmissions);
    getSchedulesByThesis(thesisId).then(setSchedules);
    getEvaluationsByThesis(thesisId).then(async (evals) => {
      setEvaluations(evals);
      if (evals.length > 0) {
        const uids = [...new Set(evals.map((e) => e.panelMemberId))];
        const users = await getUsersByIds(uids);
        const map: Record<string, TmsUser> = {};
        users.forEach((u) => { map[u.uid] = u; });
        setPanelUsers(map);
      }
    });
  }, [thesisId]);

  async function openDocument(path: string) {
    const { url, error } = await getSignedUrl(path);
    if (error || !url) { toast.error("Failed to open."); return; }
    window.open(url, "_blank");
  }

  async function handleApprove(submissionId: string) {
    setLoading((p) => ({ ...p, [submissionId]: true }));
    try {
      await updateSubmissionStatus(submissionId, "approved", feedback[submissionId]);
      if (thesis) await updateThesisStatus(thesisId, "approved");
      if (group) {
        await createNotificationsBulk(
          group.members,
          "approval",
          `Your submission for "${thesis?.title}" has been approved!`,
          thesisId
        );
      }
      setSubmissions((prev) =>
        prev.map((s) => s.id === submissionId ? { ...s, status: "approved", adviserFeedback: feedback[submissionId] ?? null } : s)
      );
      setThesis((prev) => prev ? { ...prev, stageStatus: "approved" } : prev);
      toast.success("Submission approved.");
    } catch {
      toast.error("Failed to approve.");
    } finally {
      setLoading((p) => ({ ...p, [submissionId]: false }));
    }
  }

  async function handleRequestRevision(submissionId: string) {
    if (!feedback[submissionId]?.trim()) {
      toast.error("Please provide feedback before requesting revision.");
      return;
    }
    setLoading((p) => ({ ...p, [submissionId]: true }));
    try {
      await updateSubmissionStatus(submissionId, "revision_required", feedback[submissionId]);
      if (thesis) await updateThesisStatus(thesisId, "revision_required");
      if (group) {
        await createNotificationsBulk(
          group.members,
          "approval",
          `Revision required for "${thesis?.title}". Check your adviser's feedback.`,
          thesisId
        );
      }
      setSubmissions((prev) =>
        prev.map((s) => s.id === submissionId ? { ...s, status: "revision_required", adviserFeedback: feedback[submissionId] } : s)
      );
      setThesis((prev) => prev ? { ...prev, stageStatus: "revision_required" } : prev);
      toast.success("Revision requested.");
    } catch {
      toast.error("Failed to request revision.");
    } finally {
      setLoading((p) => ({ ...p, [submissionId]: false }));
    }
  }

  if (!thesis) return <Skeleton className="h-64 w-full max-w-3xl" />;

  const latestSubmissions = submissions.filter(
    (s) => s.stage === thesis.currentStage && s.status === "pending"
  );

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-slate-900 truncate">{thesis.title}</h1>

      <Card>
        <CardContent className="pt-6">
          <StageTimeline currentStage={thesis.currentStage} stageStatus={thesis.stageStatus} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">{STAGE_LABELS[thesis.currentStage]}</CardTitle>
            <StatusBadge status={thesis.stageStatus} />
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-600">{thesis.abstract}</p>
        </CardContent>
      </Card>

      {/* Defense Schedules */}
      {schedules.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <CalendarDays className="w-4 h-4 text-blue-500" />
              Defense Schedule
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {schedules.map((s) => (
              <div key={s.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <p className="text-sm font-medium">
                    {s.scheduledAt.toDate().toLocaleString("en-PH", { dateStyle: "long", timeStyle: "short" })}
                  </p>
                  <p className="text-xs text-slate-500">{s.venue}</p>
                </div>
                <Badge variant="outline" className="text-xs shrink-0">{STAGE_LABELS[s.stage]}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Pending submissions for review */}
      {latestSubmissions.length > 0 && (
        <div className="space-y-4">
          <h2 className="font-semibold text-slate-700">Pending Review</h2>
          {latestSubmissions.map((s) => (
            <Card key={s.id} className="border-orange-200">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-slate-400" />
                    <span className="text-sm font-medium">{s.fileName}</span>
                    <span className="text-xs text-slate-400">v{s.version}</span>
                  </div>
                  <Button variant="ghost" size="icon" className="w-7 h-7" onClick={() => openDocument(s.fileUrl)}>
                    <ExternalLink className="w-4 h-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-1">
                  <Label className="text-xs">Feedback / Comments</Label>
                  <Textarea
                    placeholder="Optional feedback for the students..."
                    rows={3}
                    value={feedback[s.id] ?? ""}
                    onChange={(e) => setFeedback((p) => ({ ...p, [s.id]: e.target.value }))}
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    className="bg-green-600 hover:bg-green-500"
                    onClick={() => handleApprove(s.id)}
                    disabled={loading[s.id]}
                  >
                    <CheckCircle className="w-4 h-4 mr-1" />
                    Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-orange-300 text-orange-600 hover:bg-orange-50"
                    onClick={() => handleRequestRevision(s.id)}
                    disabled={loading[s.id]}
                  >
                    <RotateCcw className="w-4 h-4 mr-1" />
                    Request Revision
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* All submissions history */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">All Submissions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {submissions.length === 0 ? (
            <p className="text-sm text-slate-400">No submissions yet.</p>
          ) : (
            submissions.map((s) => (
              <div key={s.id} className="flex items-center justify-between p-3 border rounded-lg">
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
                  <Button variant="ghost" size="icon" className="w-7 h-7" onClick={() => openDocument(s.fileUrl)}>
                    <ExternalLink className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Panel Evaluations */}
      {evaluations.length > 0 && (
        <div className="space-y-3">
          <h2 className="font-semibold text-slate-700 flex items-center gap-2">
            <Star className="w-4 h-4 text-yellow-500" />
            Panel Evaluations
          </h2>
          {evaluations.map((ev) => {
            const panelName = panelUsers[ev.panelMemberId]?.displayName ?? "Panel Member";
            const criteria = EVALUATION_CRITERIA[ev.stage];
            return (
              <Card key={ev.id} className="border-blue-100">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-semibold">{panelName}</CardTitle>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-500">{STAGE_LABELS[ev.stage]}</span>
                      <span className="text-sm font-bold text-blue-600">{ev.overallScore}/100</span>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-1 gap-1">
                    {criteria.map((criterion) => (
                      <div key={criterion} className="flex items-center justify-between text-sm">
                        <span className="text-slate-600">{criterion}</span>
                        <span className="font-medium text-slate-800">{ev.grades[criterion] ?? "—"}/100</span>
                      </div>
                    ))}
                  </div>
                  {ev.comments && (
                    <>
                      <Separator />
                      <div>
                        <p className="text-xs font-medium text-slate-500 mb-1">Comments</p>
                        <p className="text-sm text-slate-700 whitespace-pre-wrap">{ev.comments}</p>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
