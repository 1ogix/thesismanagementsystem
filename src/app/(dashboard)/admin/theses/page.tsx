"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { getThesesByCourse } from "@/lib/firestore/theses";
import { getGroupsByCourse } from "@/lib/firestore/groups";
import { Thesis, Group, STAGE_LABELS } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/thesis/StatusBadge";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowRight } from "lucide-react";

export default function AdminThesesPage() {
  const { tmsUser } = useAuth();
  const [theses, setTheses] = useState<(Thesis & { group?: Group })[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!tmsUser) return;
    if (!tmsUser.courseId) { setLoading(false); return; }
    Promise.all([
      getThesesByCourse(tmsUser.courseId),
      getGroupsByCourse(tmsUser.courseId),
    ]).then(([ts, gs]) => {
      const groupMap = Object.fromEntries(gs.map((g) => [g.id, g]));
      setTheses(ts.map((t) => ({ ...t, group: groupMap[t.groupId] })));
      setLoading(false);
    });
  }, [tmsUser]);

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">All Theses</h1>

      {loading ? (
        <div className="space-y-3">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-24 w-full" />)}</div>
      ) : theses.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-10 text-center text-slate-400 text-sm">
            No theses have been created yet.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {theses.map((thesis) => (
            <Card key={thesis.id}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-base">{thesis.title}</CardTitle>
                  <div className="flex items-center gap-2 shrink-0">
                    <StatusBadge status={thesis.stageStatus} />
                    <Badge variant="outline" className="text-xs">
                      {STAGE_LABELS[thesis.currentStage]}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="flex items-center justify-between">
                <p className="text-sm text-slate-500">
                  Group: {thesis.group?.name ?? "—"} &middot;{" "}
                  {thesis.group?.members.length ?? 0} members &middot;{" "}
                  {thesis.group?.adviserId ? "Adviser assigned" : "No adviser"}
                </p>
                <Link href={`/admin/theses/${thesis.id}`}>
                  <Button variant="outline" size="sm">
                    Manage <ArrowRight className="w-3 h-3 ml-1" />
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
