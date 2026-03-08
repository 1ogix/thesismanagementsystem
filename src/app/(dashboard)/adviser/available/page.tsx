"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { getAllTheses } from "@/lib/firestore/theses";
import { applyAsAdviser, hasAdviserApplied } from "@/lib/firestore/adviser";
import { createNotificationsBulk } from "@/lib/firestore/notifications";
import { getGroup } from "@/lib/firestore/groups";
import { Thesis, STAGE_LABELS } from "@/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/thesis/StatusBadge";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { CheckCircle, BookOpen } from "lucide-react";

interface ThesisWithState extends Thesis {
  hasApplied: boolean;
  hasAdviser: boolean;
}

export default function AvailableThesesPage() {
  const { tmsUser } = useAuth();
  const [theses, setTheses] = useState<ThesisWithState[]>([]);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState<string | null>(null);

  useEffect(() => {
    if (!tmsUser) return;
    getAllTheses().then(async (all) => {
      const withState = await Promise.all(
        all.map(async (t) => {
          const group = await getGroup(t.groupId);
          const applied = await hasAdviserApplied(t.id, tmsUser.uid);
          return {
            ...t,
            hasApplied: applied,
            hasAdviser: !!group?.adviserId,
          };
        })
      );
      setTheses(withState);
      setLoading(false);
    }).catch((err) => {
      console.error("Failed to load available theses:", err);
      setLoading(false);
    });
  }, [tmsUser]);

  async function handleVolunteer(thesisId: string, thesisTitle: string) {
    if (!tmsUser) return;
    setApplying(thesisId);
    try {
      await applyAsAdviser(thesisId, tmsUser.uid);

      // Notify admins (simplified: notify via thesis group members)
      const thesis = theses.find((t) => t.id === thesisId);
      if (thesis) {
        const group = await getGroup(thesis.groupId);
        if (group) {
          await createNotificationsBulk(
            group.members,
            "assignment",
            `An adviser has volunteered for your thesis: "${thesisTitle}"`,
            thesisId
          );
        }
      }

      setTheses((prev) =>
        prev.map((t) => t.id === thesisId ? { ...t, hasApplied: true } : t)
      );
      toast.success("Application submitted! Wait for admin approval.");
    } catch {
      toast.error("Failed to apply.");
    } finally {
      setApplying(null);
    }
  }

  const openTheses = theses.filter((t) => !t.hasAdviser);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Open Theses</h1>
        <p className="text-slate-500 mt-1">Volunteer to advise a student thesis group.</p>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-28 w-full" />)}
        </div>
      ) : openTheses.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <BookOpen className="w-8 h-8 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 text-sm">All theses have advisers assigned.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {openTheses.map((thesis) => (
            <Card key={thesis.id}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-base">{thesis.title}</CardTitle>
                  <StatusBadge status={thesis.stageStatus} />
                </div>
                <CardDescription className="line-clamp-2">{thesis.abstract}</CardDescription>
              </CardHeader>
              <CardContent className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">
                    {STAGE_LABELS[thesis.currentStage]}
                  </Badge>
                </div>
                {thesis.hasApplied ? (
                  <div className="flex items-center gap-1 text-sm text-green-600">
                    <CheckCircle className="w-4 h-4" />
                    Applied — Pending Approval
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
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
