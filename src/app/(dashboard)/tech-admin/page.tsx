"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { getCoursesBySchool } from "@/lib/firestore/courses";
import { getUsersBySchool } from "@/lib/firestore/users";
import { getThesesBySchool } from "@/lib/firestore/theses";
import { getGroupsBySchool } from "@/lib/firestore/groups";
import { getSchool } from "@/lib/firestore/schools";
import { Course, School } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, FileText, BookOpen, CheckCircle } from "lucide-react";

export default function TechAdminDashboard() {
  const { tmsUser } = useAuth();
  const [school, setSchool] = useState<School | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [stats, setStats] = useState({
    users: 0,
    theses: 0,
    groups: 0,
    completed: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!tmsUser) return;
    if (!tmsUser.schoolId) {
      setLoading(false);
      return;
    }
    Promise.all([
      getSchool(tmsUser.schoolId),
      getCoursesBySchool(tmsUser.schoolId),
      getUsersBySchool(tmsUser.schoolId),
      getThesesBySchool(tmsUser.schoolId),
      getGroupsBySchool(tmsUser.schoolId),
    ]).then(([s, c, users, theses, groups]) => {
      setSchool(s);
      setCourses(c);
      setStats({
        users: users.length,
        theses: theses.length,
        groups: groups.length,
        completed: theses.filter((t) => t.stageStatus === "completed").length,
      });
      setLoading(false);
    });
  }, [tmsUser]);

  const statCards = [
    {
      label: "Total Users",
      value: stats.users,
      icon: Users,
      color: "text-blue-600",
    },
    {
      label: "Total Theses",
      value: stats.theses,
      icon: FileText,
      color: "text-purple-600",
    },
    {
      label: "Active Groups",
      value: stats.groups,
      icon: BookOpen,
      color: "text-orange-500",
    },
    {
      label: "Completed Theses",
      value: stats.completed,
      icon: CheckCircle,
      color: "text-green-600",
    },
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        {loading ? (
          <Skeleton className="h-10 w-72 mb-2" />
        ) : (
          <h1 className="text-4xl font-bold text-slate-900">
            {school?.name ?? "Your School"}
          </h1>
        )}
        <h2 className="text-2xl font-bold text-slate-900">
          Tech Admin Dashboard
        </h2>

        <p className="text-slate-500 mt-1">
          School-wide overview across all courses.
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {loading
          ? Array(4)
              .fill(0)
              .map((_, i) => <Skeleton key={i} className="h-28" />)
          : statCards.map(({ label, value, icon: Icon, color }) => (
              <Card key={label}>
                <CardContent className="pt-5">
                  <Icon className={`w-6 h-6 ${color} mb-2`} />
                  <p className={`text-3xl font-bold ${color}`}>{value}</p>
                  <p className="text-xs text-slate-500 mt-1">{label}</p>
                </CardContent>
              </Card>
            ))}
      </div>

      {/* Course overview */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Courses at This School</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : courses.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-6">
              No courses yet. Go to Courses to add some.
            </p>
          ) : (
            <div className="space-y-2">
              {courses.map((c) => (
                <div
                  key={c.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <p className="text-sm font-medium text-slate-800">{c.name}</p>
                  <Badge
                    variant={c.active ? "default" : "outline"}
                    className="text-xs"
                  >
                    {c.active ? "Active" : "Inactive"}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
