"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { getApplicationsByAdviser } from "@/lib/firestore/adviser";
import { getThesis } from "@/lib/firestore/theses";
import { AdviserApplication, Thesis, STAGE_LABELS } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/thesis/StatusBadge";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowRight, FileText } from "lucide-react";

export default function AssignedThesesPage() {
  const { tmsUser } = useAuth();
  const [items, setItems] = useState<{ app: AdviserApplication; thesis: Thesis | null }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!tmsUser) return;
    getApplicationsByAdviser(tmsUser.uid).then(async (apps) => {
      const approved = apps.filter((a) => a.status === "approved");
      const withThesis = await Promise.all(
        approved.map(async (app) => ({ app, thesis: await getThesis(app.thesisId) }))
      );
      setItems(withThesis.filter((item) => item.thesis !== null));
      setLoading(false);
    });
  }, [tmsUser]);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">My Advisees</h1>

      {loading ? (
        <div className="space-y-3">{[1, 2].map((i) => <Skeleton key={i} className="h-24 w-full" />)}</div>
      ) : items.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <FileText className="w-8 h-8 text-slate-300 mx-auto mb-3" />
            <p className="text-sm text-slate-500">No assigned theses yet.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {items.map(({ app, thesis }) => (
            <Card key={app.id}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <CardTitle className="text-base">{thesis?.title ?? "—"}</CardTitle>
                  {thesis && <StatusBadge status={thesis.stageStatus} />}
                </div>
              </CardHeader>
              <CardContent className="flex items-center justify-between">
                <p className="text-sm text-slate-500">
                  {thesis ? STAGE_LABELS[thesis.currentStage] : "—"}
                </p>
                <Link href={`/adviser/thesis/${app.thesisId}`}>
                  <Button variant="outline" size="sm">
                    Review <ArrowRight className="w-3 h-3 ml-1" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
