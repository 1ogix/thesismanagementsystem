"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { getGroupByMember } from "@/lib/firestore/groups";
import { createThesis, getThesisByGroup, updateThesis } from "@/lib/firestore/theses";
import { Group, Thesis } from "@/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { StatusBadge } from "@/components/thesis/StatusBadge";
import { StageTimeline } from "@/components/thesis/StageTimeline";
import { Skeleton } from "@/components/ui/skeleton";
import { FileText, ArrowRight, Pencil } from "lucide-react";
import { toast } from "sonner";
import { STAGE_LABELS } from "@/types";

function getSubmissionActionLabel(stage: Thesis["currentStage"]) {
  if (stage === "pre_oral") return "Submit Pre-Oral Paper";
  if (stage === "final_oral") return "Submit Final Oral Paper";
  if (stage === "manuscript") return "Submit Final Manuscript";
  return "Submit Proposal Paper";
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
      return "Your defense has been evaluated. Wait for the admin decision for this stage.";
    case "approved":
      return "This stage has already been approved. Wait for the next stage to open.";
    case "completed":
      return "Your thesis workflow has already been completed.";
    case "rejected":
      return "This stage was rejected. Please contact your adviser or admin for next steps.";
    default:
      return null;
  }
}

export default function ThesisPage() {
  const { tmsUser } = useAuth();
  const [group, setGroup] = useState<Group | null>(null);
  const [thesis, setThesis] = useState<Thesis | null | undefined>(undefined);
  const [form, setForm] = useState({ title: "", abstract: "" });
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!tmsUser) return;
    getGroupByMember(tmsUser.uid).then((g) => {
      setGroup(g);
      if (g) {
        getThesisByGroup(g.id).then((t) => {
          setThesis(t);
          if (t) setForm({ title: t.title, abstract: t.abstract });
        });
      } else {
        setThesis(null);
      }
    });
  }, [tmsUser]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!group) return;
    setLoading(true);
    try {
      await createThesis(group.id, form.title.trim(), form.abstract.trim());
      const t = await getThesisByGroup(group.id);
      setThesis(t);
      toast.success("Thesis created!");
    } catch {
      toast.error("Failed to create thesis.");
    } finally {
      setLoading(false);
    }
  }

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault();
    if (!thesis) return;
    setLoading(true);
    try {
      await updateThesis(thesis.id, { title: form.title, abstract: form.abstract });
      setThesis((prev) => prev ? { ...prev, ...form } : prev);
      setEditing(false);
      toast.success("Thesis updated.");
    } catch {
      toast.error("Failed to update thesis.");
    } finally {
      setLoading(false);
    }
  }

  if (thesis === undefined) return <Skeleton className="h-64 w-full max-w-3xl" />;

  const canSubmit =
    thesis?.stageStatus === "draft" || thesis?.stageStatus === "revision_required";
  const blockedStageMessage = thesis ? getBlockedStageMessage(thesis.stageStatus) : null;
  const submissionActionLabel = thesis
    ? getSubmissionActionLabel(thesis.currentStage)
    : "Submit Document";

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">My Thesis</h1>

      {!group ? (
        <Card className="border-dashed">
          <CardContent className="py-10 text-center text-slate-500">
            You must be in a group before creating a thesis.{" "}
            <Link href="/student/group" className="text-blue-600 underline">
              Create a group first.
            </Link>
          </CardContent>
        </Card>
      ) : !thesis ? (
        <Card>
          <CardHeader>
            <CardTitle>Create Your Thesis</CardTitle>
            <CardDescription>
              Enter your thesis title and abstract to get started.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="space-y-1">
                <Label>Thesis Title</Label>
                <Input
                  placeholder="e.g. A Proposed System for..."
                  value={form.title}
                  onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-1">
                <Label>Abstract</Label>
                <Textarea
                  placeholder="Briefly describe your thesis..."
                  rows={5}
                  value={form.abstract}
                  onChange={(e) => setForm((p) => ({ ...p, abstract: e.target.value }))}
                  required
                />
              </div>
              <Button type="submit" className="bg-blue-600 hover:bg-blue-500" disabled={loading}>
                Create Thesis
              </Button>
            </form>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {/* Stage timeline */}
          <Card>
            <CardContent className="pt-6">
              <StageTimeline currentStage={thesis.currentStage} stageStatus={thesis.stageStatus} />
            </CardContent>
          </Card>

          {/* Thesis details */}
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between gap-2">
                <div>
                  {editing ? (
                    <Input
                      value={form.title}
                      onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                      className="text-lg font-semibold"
                    />
                  ) : (
                    <CardTitle>{thesis.title}</CardTitle>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <StatusBadge status={thesis.stageStatus} />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="w-7 h-7"
                    onClick={() => setEditing((p) => !p)}
                  >
                    <Pencil className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-xs text-slate-500 mb-1 uppercase tracking-wide">Current Stage</p>
                <p className="text-sm font-medium text-blue-700">
                  {STAGE_LABELS[thesis.currentStage]}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500 mb-1 uppercase tracking-wide">Abstract</p>
                {editing ? (
                  <Textarea
                    rows={5}
                    value={form.abstract}
                    onChange={(e) => setForm((p) => ({ ...p, abstract: e.target.value }))}
                  />
                ) : (
                  <p className="text-sm text-slate-700 leading-relaxed">{thesis.abstract}</p>
                )}
              </div>
              {editing && (
                <div className="flex gap-2">
                  <Button onClick={handleUpdate} className="bg-blue-600 hover:bg-blue-500" disabled={loading}>
                    Save Changes
                  </Button>
                  <Button variant="outline" onClick={() => setEditing(false)}>Cancel</Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick action */}
          {canSubmit && (
            <Card className="border-blue-200 bg-blue-50">
              <CardContent className="flex items-center justify-between py-4">
                <div className="flex items-center gap-3">
                  <FileText className="w-5 h-5 text-blue-600" />
                  <div>
                    <p className="text-sm font-medium text-blue-800">
                      Ready to submit for {STAGE_LABELS[thesis.currentStage]}?
                    </p>
                    <p className="text-xs text-blue-600">
                      Upload the revised PDF for this stage. Each new upload is saved as a new version.
                    </p>
                  </div>
                </div>
                <Link href={`/student/thesis/${thesis.id}/submit`}>
                  <Button className="bg-blue-600 hover:bg-blue-500" size="sm">
                    {submissionActionLabel} <ArrowRight className="w-3 h-3 ml-1" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          )}

          {!canSubmit && blockedStageMessage && (
            <Card className="border-slate-200 bg-slate-50">
              <CardContent className="flex items-center justify-between py-4">
                <div className="flex items-center gap-3">
                  <FileText className="w-5 h-5 text-slate-400" />
                  <div>
                    <p className="text-sm font-medium text-slate-800">
                      {STAGE_LABELS[thesis.currentStage]} is currently closed for student submission
                    </p>
                    <p className="text-xs text-slate-500">{blockedStageMessage}</p>
                  </div>
                </div>
                <Link href={`/student/thesis/${thesis.id}`}>
                  <Button variant="outline" size="sm">
                    View Details <ArrowRight className="w-3 h-3 ml-1" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
