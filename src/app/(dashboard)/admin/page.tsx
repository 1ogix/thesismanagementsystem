"use client";

import { useEffect, useState } from "react";
import { getAllUsers } from "@/lib/firestore/users";
import { getAllTheses } from "@/lib/firestore/theses";
import { getAllGroups } from "@/lib/firestore/groups";
import { getAllSchedules } from "@/lib/firestore/schedules";
import { DefenseSchedule, Thesis, STAGE_LABELS } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, FileText, BookOpen, CheckCircle, CalendarDays } from "lucide-react";

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    users: 0, theses: 0, groups: 0, approved: 0,
  });
  const [loading, setLoading] = useState(true);
  const [upcomingSchedules, setUpcomingSchedules] = useState<(DefenseSchedule & { thesisTitle: string })[]>([]);

  useEffect(() => {
    Promise.all([getAllUsers(), getAllTheses(), getAllGroups(), getAllSchedules()]).then(
      ([users, theses, groups, schedules]) => {
        setStats({
          users: users.length,
          theses: theses.length,
          groups: groups.length,
          approved: theses.filter((t) => t.stageStatus === "approved").length,
        });

        const thesisMap = Object.fromEntries(theses.map((t: Thesis) => [t.id, t.title]));
        const now = new Date();
        const upcoming = schedules
          .filter((s) => s.scheduledAt.toDate() >= now)
          .sort((a, b) => a.scheduledAt.toMillis() - b.scheduledAt.toMillis())
          .slice(0, 5)
          .map((s) => ({ ...s, thesisTitle: thesisMap[s.thesisId] ?? "Unknown thesis" }));
        setUpcomingSchedules(upcoming);

        setLoading(false);
      }
    );
  }, []);

  const cards = [
    { label: "Total Users", value: stats.users, icon: Users, color: "text-blue-600" },
    { label: "Total Theses", value: stats.theses, icon: FileText, color: "text-purple-600" },
    { label: "Active Groups", value: stats.groups, icon: BookOpen, color: "text-orange-500" },
    { label: "Approved Stages", value: stats.approved, icon: CheckCircle, color: "text-green-600" },
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Admin Dashboard</h1>
        <p className="text-slate-500 mt-1">System-wide overview and management.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {loading
          ? Array(4).fill(0).map((_, i) => <Skeleton key={i} className="h-28" />)
          : cards.map(({ label, value, icon: Icon, color }) => (
              <Card key={label}>
                <CardContent className="pt-5">
                  <Icon className={`w-6 h-6 ${color} mb-2`} />
                  <p className={`text-3xl font-bold ${color}`}>{value}</p>
                  <p className="text-xs text-slate-500 mt-1">{label}</p>
                </CardContent>
              </Card>
            ))}
      </div>

      {/* Upcoming defense schedules */}
      {!loading && upcomingSchedules.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <CalendarDays className="w-4 h-4 text-blue-500" />
              Upcoming Defenses
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {upcomingSchedules.map((s) => (
              <div key={s.id} className="flex items-start justify-between gap-3 p-3 border rounded-lg">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-800 truncate">{s.thesisTitle}</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {s.scheduledAt.toDate().toLocaleString("en-PH", { dateStyle: "long", timeStyle: "short" })} · {s.venue}
                  </p>
                </div>
                <Badge variant="outline" className="text-xs shrink-0">{STAGE_LABELS[s.stage]}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
