"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { getGroupByMember } from "@/lib/firestore/groups";
import { getThesisByGroup } from "@/lib/firestore/theses";
import { getSchedulesByThesis } from "@/lib/firestore/schedules";
import { Group, Thesis, DefenseSchedule, STAGE_LABELS } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/thesis/StatusBadge";
import { StageTimeline } from "@/components/thesis/StageTimeline";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, FileText, ArrowRight, CalendarDays } from "lucide-react";

export default function StudentDashboard() {
  const { tmsUser } = useAuth();
  const [group, setGroup] = useState<Group | null | undefined>(undefined);
  const [thesis, setThesis] = useState<Thesis | null>(null);
  const [schedules, setSchedules] = useState<DefenseSchedule[]>([]);

  useEffect(() => {
    if (!tmsUser) return;
    getGroupByMember(tmsUser.uid).then((g) => {
      setGroup(g);
      if (g) {
        getThesisByGroup(g.id).then((t) => {
          setThesis(t);
          if (t) getSchedulesByThesis(t.id).then(setSchedules);
        });
      }
    });
  }, [tmsUser]);

  const loading = group === undefined;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">
          Welcome, {tmsUser?.displayName} 👋
        </h1>
        <p className="text-slate-500 mt-1">Here&apos;s your thesis overview.</p>
      </div>

      {loading ? (
        <div className="space-y-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      ) : !group ? (
        <Card className="border-dashed border-2">
          <CardContent className="flex flex-col items-center justify-center py-12 gap-4">
            <Users className="w-10 h-10 text-slate-300" />
            <div className="text-center">
              <p className="font-medium text-slate-700">You&apos;re not in a group yet</p>
              <p className="text-sm text-slate-500 mt-1">
                Create a group to start your thesis journey.
              </p>
            </div>
            <Link href="/student/group">
              <Button className="bg-blue-600 hover:bg-blue-500">Create Group</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {/* Group card */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-500" />
                {group.name}
              </CardTitle>
            </CardHeader>
            <CardContent className="flex items-center justify-between">
              <div className="text-sm text-slate-500">
                {group.members.length} member{group.members.length !== 1 ? "s" : ""} &middot;{" "}
                {group.adviserId ? "Adviser assigned" : "No adviser yet"}
              </div>
              <Link href="/student/group">
                <Button variant="outline" size="sm">
                  Manage <ArrowRight className="w-3 h-3 ml-1" />
                </Button>
              </Link>
            </CardContent>
          </Card>

          {/* Upcoming defense schedules */}
          {schedules.length > 0 && (
            <Card className="border-blue-200 bg-blue-50">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2 text-blue-800">
                  <CalendarDays className="w-4 h-4" />
                  Upcoming Defense
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {schedules
                  .sort((a, b) => a.scheduledAt.toMillis() - b.scheduledAt.toMillis())
                  .map((s) => (
                    <div key={s.id} className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-medium text-blue-900">
                          {s.scheduledAt.toDate().toLocaleString("en-PH", { dateStyle: "long", timeStyle: "short" })}
                        </p>
                        <p className="text-xs text-blue-700">{s.venue}</p>
                      </div>
                      <Badge variant="outline" className="text-xs shrink-0 border-blue-300 text-blue-700">
                        {STAGE_LABELS[s.stage]}
                      </Badge>
                    </div>
                  ))}
              </CardContent>
            </Card>
          )}

          {/* Thesis card */}
          {!thesis ? (
            <Card className="border-dashed border-2">
              <CardContent className="flex flex-col items-center justify-center py-10 gap-4">
                <FileText className="w-8 h-8 text-slate-300" />
                <div className="text-center">
                  <p className="font-medium text-slate-700">No thesis created yet</p>
                  <p className="text-sm text-slate-500 mt-1">
                    Create your thesis to start submitting documents.
                  </p>
                </div>
                <Link href="/student/thesis">
                  <Button className="bg-blue-600 hover:bg-blue-500">Create Thesis</Button>
                </Link>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <CardTitle className="text-base">{thesis.title}</CardTitle>
                  <StatusBadge status={thesis.stageStatus} />
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <StageTimeline
                  currentStage={thesis.currentStage}
                  stageStatus={thesis.stageStatus}
                />
                <div className="flex justify-end">
                  <Link href={`/student/thesis/${thesis.id}`}>
                    <Button variant="outline" size="sm">
                      View Details <ArrowRight className="w-3 h-3 ml-1" />
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
