"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { getThesesByPanel } from "@/lib/firestore/panel";
import { getThesis } from "@/lib/firestore/theses";
import { getEvaluationByPanel } from "@/lib/firestore/panel";
import { getSchedulesByPanelMember } from "@/lib/firestore/schedules";
import { getAllTheses } from "@/lib/firestore/theses";
import { PanelAssignment, Thesis, DefenseSchedule, STAGE_LABELS } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/thesis/StatusBadge";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { ClipboardCheck, ArrowRight, CheckCircle, CalendarDays } from "lucide-react";

interface AssignmentWithThesis extends PanelAssignment {
  thesis: Thesis | null;
  hasEvaluated: boolean;
}

export default function PanelDashboard() {
  const { tmsUser } = useAuth();
  const [assignments, setAssignments] = useState<AssignmentWithThesis[]>([]);
  const [loading, setLoading] = useState(true);
  const [schedules, setSchedules] = useState<(DefenseSchedule & { thesisTitle: string })[]>([]);

  useEffect(() => {
    if (!tmsUser) return;
    Promise.all([
      getThesesByPanel(tmsUser.uid),
      getSchedulesByPanelMember(tmsUser.uid),
      getAllTheses(),
    ]).then(async ([assigns, panelSchedules, allTheses]) => {
      const withThesis = await Promise.all(
        assigns.map(async (a) => {
          const thesis = await getThesis(a.thesisId);
          const evaluation = await getEvaluationByPanel(a.thesisId, tmsUser.uid, a.stage);
          return { ...a, thesis, hasEvaluated: !!evaluation };
        })
      );
      setAssignments(withThesis.filter((a) => a.thesis !== null));

      const thesisMap = Object.fromEntries(allTheses.map((t: Thesis) => [t.id, t.title]));
      const now = new Date();
      setSchedules(
        panelSchedules
          .filter((s) => s.scheduledAt.toDate() >= now)
          .sort((a, b) => a.scheduledAt.toMillis() - b.scheduledAt.toMillis())
          .map((s) => ({ ...s, thesisTitle: thesisMap[s.thesisId] ?? "Unknown thesis" }))
      );

      setLoading(false);
    });
  }, [tmsUser]);

  const pending = assignments.filter((a) => !a.hasEvaluated);
  const done = assignments.filter((a) => a.hasEvaluated);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Panel Dashboard</h1>
        <p className="text-slate-500 mt-1">Manage your assigned evaluations.</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4">
            <p className="text-2xl font-bold text-blue-600">{assignments.length}</p>
            <p className="text-xs text-slate-500">Total Assignments</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-2xl font-bold text-orange-500">{pending.length}</p>
            <p className="text-xs text-slate-500">Pending Evaluation</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-2xl font-bold text-green-600">{done.length}</p>
            <p className="text-xs text-slate-500">Evaluated</p>
          </CardContent>
        </Card>
      </div>

      {/* Upcoming defense schedules */}
      {!loading && schedules.length > 0 && (
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2 text-blue-800">
              <CalendarDays className="w-4 h-4" />
              Upcoming Defenses
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {schedules.map((s) => (
              <div key={s.id} className="flex items-start justify-between gap-3 p-3 bg-white border border-blue-100 rounded-lg">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-800 truncate">{s.thesisTitle}</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {s.scheduledAt.toDate().toLocaleString("en-PH", { dateStyle: "long", timeStyle: "short" })} · {s.venue}
                  </p>
                </div>
                <Badge variant="outline" className="text-xs shrink-0 border-blue-300 text-blue-700">
                  {STAGE_LABELS[s.stage]}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {loading ? (
        <div className="space-y-3">
          {[1, 2].map((i) => <Skeleton key={i} className="h-24 w-full" />)}
        </div>
      ) : assignments.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <ClipboardCheck className="w-8 h-8 text-slate-300 mx-auto mb-3" />
            <p className="text-sm text-slate-500">No evaluations assigned yet.</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {pending.length > 0 && (
            <div>
              <h2 className="font-semibold text-slate-700 mb-3">Pending Evaluation</h2>
              <div className="space-y-3">
                {pending.map((a) => (
                  <Card key={a.id} className="border-orange-200">
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between">
                        <CardTitle className="text-base">{a.thesis?.title ?? "—"}</CardTitle>
                        <Badge variant="outline" className="text-xs">{STAGE_LABELS[a.stage]}</Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="flex items-center justify-between">
                      {a.thesis && <StatusBadge status={a.thesis.stageStatus} />}
                      <Link href={`/panel/thesis/${a.thesisId}/evaluate?stage=${a.stage}`}>
                        <Button size="sm" className="bg-blue-600 hover:bg-blue-500">
                          Evaluate <ArrowRight className="w-3 h-3 ml-1" />
                        </Button>
                      </Link>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {done.length > 0 && (
            <div>
              <h2 className="font-semibold text-slate-700 mb-3">Completed</h2>
              <div className="space-y-3">
                {done.map((a) => (
                  <Card key={a.id} className="bg-slate-50">
                    <CardContent className="flex items-center justify-between py-4">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-green-500" />
                        <p className="text-sm font-medium">{a.thesis?.title ?? "—"}</p>
                        <Badge variant="outline" className="text-xs">{STAGE_LABELS[a.stage]}</Badge>
                      </div>
                      <Link href={`/panel/thesis/${a.thesisId}/evaluate?stage=${a.stage}`}>
                        <Button size="sm" variant="outline">View</Button>
                      </Link>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
