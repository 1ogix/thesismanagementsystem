"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { getThesesByCourse } from "@/lib/firestore/theses";
import {
  applyAsAdviser,
  getApplicationsByAdviser,
} from "@/lib/firestore/adviser";
import { createNotificationsBulk } from "@/lib/firestore/notifications";
import { getGroup } from "@/lib/firestore/groups";
import { getLatestSubmission } from "@/lib/firestore/submissions";
import { getSignedUrl } from "@/lib/supabase";
import { Thesis, STAGE_LABELS, Submission } from "@/types";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/thesis/StatusBadge";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { CheckCircle, BookOpen, UserCheck, ExternalLink } from "lucide-react";

interface ThesisWithState extends Thesis {
  hasApplied: boolean;
  hasAdviser: boolean;
  latestSubmission: Submission | null;
}

export default function AvailableThesesPage() {
  const { tmsUser } = useAuth();
  const [theses, setTheses] = useState<ThesisWithState[]>([]);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState<string | null>(null);

  useEffect(() => {
    if (!tmsUser?.courseId) return;
    getThesesByCourse(tmsUser.courseId)
      .then(async (all) => {
        const myApplications = await getApplicationsByAdviser(tmsUser.uid);
        const withState = await Promise.all(
          all.map(async (t) => {
            const group = await getGroup(t.groupId);
            const latestSubmission = await getLatestSubmission(
              t.id,
              t.currentStage,
            );
            return {
              ...t,
              hasApplied: myApplications.some((a) => a.thesisId === t.id),
              hasAdviser: !!group?.adviserId,
              latestSubmission,
            };
          }),
        );
        setTheses(withState);
        setLoading(false);
      })
      .catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : String(err);
        console.error("Failed to load available theses:", msg);
        toast.error(`Error loading theses: ${msg}`);
        setLoading(false);
      });
  }, [tmsUser]);

  async function handleVolunteer(thesisId: string, thesisTitle: string) {
    if (!tmsUser) return;
    setApplying(thesisId);
    try {
      await applyAsAdviser(thesisId, tmsUser.uid);

      const thesis = theses.find((t) => t.id === thesisId);
      if (thesis) {
        const group = await getGroup(thesis.groupId);
        if (group) {
          await createNotificationsBulk(
            group.members,
            "assignment",
            `An adviser has volunteered for your thesis: "${thesisTitle}"`,
            thesisId,
          );
        }
      }

      setTheses((prev) =>
        prev.map((t) => (t.id === thesisId ? { ...t, hasApplied: true } : t)),
      );
      toast.success("Application submitted! Wait for admin approval.");
    } catch {
      toast.error("Failed to apply.");
    } finally {
      setApplying(null);
    }
  }

  async function handleReadFile(thesis: ThesisWithState) {
    const submission = thesis.latestSubmission;
    if (!submission) {
      toast.error("No uploaded file available for this thesis yet.");
      return;
    }

    const { url, error } = await getSignedUrl(submission.fileUrl);
    if (error || !url) {
      toast.error("Failed to open document.");
      return;
    }

    window.open(url, "_blank");
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">All Theses</h1>
        <p className="text-slate-500 mt-1">
          Browse theses and volunteer to advise a group.
        </p>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-28 w-full" />
          ))}
        </div>
      ) : theses.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <BookOpen className="w-8 h-8 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 text-sm">
              No theses have been created yet.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {theses.map((thesis) => (
            <Card
              key={thesis.id}
              className={thesis.hasAdviser ? "bg-slate-50 opacity-75" : ""}
            >
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-base">{thesis.title}</CardTitle>
                  <StatusBadge status={thesis.stageStatus} />
                </div>
                <CardDescription className="line-clamp-2">
                  {thesis.abstract}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">
                    {STAGE_LABELS[thesis.currentStage]}
                  </Badge>
                  {thesis.hasAdviser && (
                    <Badge
                      variant="secondary"
                      className="text-xs flex items-center gap-1"
                    >
                      <UserCheck className="w-3 h-3" />
                      Adviser Assigned
                    </Badge>
                  )}
                  {/* FILE NAME BELOW UNCOMMENT WHEN FILE NAME SHOULD BE INCLUDED */}
                  {/* {thesis.latestSubmission && (
                    <Badge variant="outline" className="text-xs">
                      {thesis.latestSubmission.fileName}
                    </Badge>
                  )} */}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleReadFile(thesis)}
                    disabled={!thesis.latestSubmission}
                  >
                    <ExternalLink className="w-3 h-3 mr-1" />
                    Read File
                  </Button>
                  {thesis.hasAdviser ? null : thesis.hasApplied ? (
                    <div className="text-right">
                      <div className="flex items-center gap-1 text-sm text-green-600">
                        <CheckCircle className="w-4 h-4" />
                        Applied — Pending Approval
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">
                        The admin will review your application.
                      </p>
                    </div>
                  ) : (
                    <Button
                      size="sm"
                      className="bg-blue-600 hover:bg-blue-500"
                      onClick={() => handleVolunteer(thesis.id, thesis.title)}
                      disabled={applying === thesis.id}
                    >
                      Volunteer as Adviser
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
