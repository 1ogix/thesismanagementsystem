"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { getThesis } from "@/lib/firestore/theses";
import { getSubmissionsByThesis } from "@/lib/firestore/submissions";
import { getSignedUrl } from "@/lib/supabase";
import { Thesis, Submission, STAGE_LABELS } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/thesis/StatusBadge";
import { StageTimeline } from "@/components/thesis/StageTimeline";
import { Skeleton } from "@/components/ui/skeleton";
import { FileText, ExternalLink, ArrowLeft } from "lucide-react";
import { toast } from "sonner";

export default function ThesisDetailPage() {
  const params = useParams();
  const thesisId = params.thesisId as string;
  const [thesis, setThesis] = useState<Thesis | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);

  useEffect(() => {
    getThesis(thesisId).then(setThesis);
    getSubmissionsByThesis(thesisId).then(setSubmissions);
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
