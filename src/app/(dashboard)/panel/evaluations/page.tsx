"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { getThesesByPanel } from "@/lib/firestore/panel";
import { getThesis } from "@/lib/firestore/theses";
import { getEvaluationByPanel } from "@/lib/firestore/panel";
import { getSchedulesByThesis } from "@/lib/firestore/schedules";
import { PanelAssignment, Thesis, DefenseSchedule, STAGE_LABELS } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ClipboardCheck, ArrowRight, CheckCircle, CalendarDays } from "lucide-react";

interface AssignmentRow extends PanelAssignment {
  thesis: Thesis | null;
  hasEvaluated: boolean;
  score: number | null;
  schedule: DefenseSchedule | null;
}

export default function EvaluationsPage() {
  const { tmsUser } = useAuth();
  const [rows, setRows] = useState<AssignmentRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!tmsUser) return;
    getThesesByPanel(tmsUser.uid).then(async (assigns) => {
      const enriched = await Promise.all(
        assigns.map(async (a) => {
          const thesis = await getThesis(a.thesisId);
          const evaluation = await getEvaluationByPanel(a.thesisId, tmsUser.uid, a.stage);
          const schedules = await getSchedulesByThesis(a.thesisId);
          const schedule = schedules.find((s) => s.stage === a.stage) ?? null;
          return {
            ...a,
            thesis,
            hasEvaluated: !!evaluation,
            score: evaluation?.overallScore ?? null,
            schedule,
          };
        })
      );
      setRows(enriched.filter((r) => r.thesis !== null));
      setLoading(false);
    });
  }, [tmsUser]);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">My Evaluations</h1>

      {loading ? (
        <div className="space-y-3">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-20 w-full" />)}</div>
      ) : rows.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <ClipboardCheck className="w-8 h-8 text-slate-300 mx-auto mb-3" />
            <p className="text-sm text-slate-500">No evaluations assigned yet.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {rows.map((row) => (
            <Card key={row.id} className={row.hasEvaluated ? "bg-slate-50" : ""}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{row.thesis?.title ?? "—"}</CardTitle>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">{STAGE_LABELS[row.stage]}</Badge>
                    {row.hasEvaluated && (
                      <div className="flex items-center gap-1 text-xs text-green-600 font-medium">
                        <CheckCircle className="w-3 h-3" />
                        {row.score}/100
                      </div>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="flex items-center justify-between">
                {row.schedule ? (
                  <p className="text-xs text-slate-500 flex items-center gap-1">
                    <CalendarDays className="w-3 h-3 shrink-0" />
                    {row.schedule.scheduledAt.toDate().toLocaleString("en-PH", { dateStyle: "long", timeStyle: "short" })}
                    {" · "}{row.schedule.venue}
                  </p>
                ) : (
                  <span />
                )}
                <Link href={`/panel/thesis/${row.thesisId}/evaluate?stage=${row.stage}`}>
                  <Button
                    size="sm"
                    variant={row.hasEvaluated ? "outline" : "default"}
                    className={!row.hasEvaluated ? "bg-blue-600 hover:bg-blue-500" : ""}
                  >
                    {row.hasEvaluated ? "View" : "Evaluate"}
                    <ArrowRight className="w-3 h-3 ml-1" />
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
