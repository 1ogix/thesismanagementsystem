"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { getThesis } from "@/lib/firestore/theses";
import { getSubmissionsByThesis } from "@/lib/firestore/submissions";
import { getEvaluationsByThesis } from "@/lib/firestore/panel";
import { getSchedulesByThesis } from "@/lib/firestore/schedules";
import { getUsersByIds } from "@/lib/firestore/users";
import { getSignedUrl } from "@/lib/supabase";
import { Thesis, Submission, Evaluation, DefenseSchedule, TmsUser, STAGE_LABELS, EVALUATION_CRITERIA } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/thesis/StatusBadge";
import { StageTimeline } from "@/components/thesis/StageTimeline";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { FileText, ExternalLink, ArrowLeft, Star, CalendarDays } from "lucide-react";
import { toast } from "sonner";

export default function ThesisDetailPage() {
  const params = useParams();
  const thesisId = params.thesisId as string;
  const [thesis, setThesis] = useState<Thesis | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [schedules, setSchedules] = useState<DefenseSchedule[]>([]);
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [panelUsers, setPanelUsers] = useState<Record<string, TmsUser>>({});

  useEffect(() => {
    getThesis(thesisId).then(setThesis);
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
    if (error || !url) { toast.error("Failed to open document."); return; }
    window.open(url, "_blank");
  }

  if (!thesis) return <Skeleton className="h-64 w-full max-w-3xl" />;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/student/thesis">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="w-4 h-4 mr-1" /> Back
          </Button>
        </Link>
        <h1 className="text-2xl font-bold text-slate-900 truncate">{thesis.title}</h1>
      </div>

      <Card>
        <CardContent className="pt-6">
          <StageTimeline currentStage={thesis.currentStage} stageStatus={thesis.stageStatus} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Status</CardTitle>
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

      {/* Submissions per stage */}
      {(["proposal", "pre_oral", "final_oral", "manuscript"] as const).map((stage) => {
        const stageSubs = submissions.filter((s) => s.stage === stage);
        if (stageSubs.length === 0) return null;
        return (
          <Card key={stage}>
            <CardHeader>
              <CardTitle className="text-base">{STAGE_LABELS[stage]} — Submissions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {stageSubs.map((s) => (
                <div key={s.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <FileText className="w-4 h-4 text-slate-400" />
                    <div>
                      <p className="text-sm font-medium">{s.fileName}</p>
                      <p className="text-xs text-slate-500">Version {s.version}</p>
                      {s.adviserFeedback && (
                        <p className="text-xs text-orange-600 mt-1">
                          Feedback: {s.adviserFeedback}
                        </p>
                      )}
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
              ))}
            </CardContent>
          </Card>
        );
      })}

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

      {(thesis.stageStatus === "draft" ||
        thesis.stageStatus === "revision_required") && (
        <div className="flex justify-end">
          <Link href={`/student/thesis/${thesisId}/submit`}>
            <Button className="bg-blue-600 hover:bg-blue-500">
              Submit Document for {STAGE_LABELS[thesis.currentStage]}
            </Button>
          </Link>
        </div>
      )}
    </div>
  );
}
