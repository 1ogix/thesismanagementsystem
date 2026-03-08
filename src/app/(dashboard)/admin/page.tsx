"use client";

import { useEffect, useState } from "react";
import { getAllUsers } from "@/lib/firestore/users";
import { getAllTheses } from "@/lib/firestore/theses";
import { getAllGroups } from "@/lib/firestore/groups";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, FileText, BookOpen, CheckCircle } from "lucide-react";

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    users: 0, theses: 0, groups: 0, approved: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getAllUsers(), getAllTheses(), getAllGroups()]).then(
      ([users, theses, groups]) => {
        setStats({
          users: users.length,
          theses: theses.length,
          groups: groups.length,
          approved: theses.filter((t) => t.stageStatus === "approved").length,
        });
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
    </div>
  );
}
