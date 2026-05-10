"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { getUsersBySchool, updateUserRole } from "@/lib/firestore/users";
import { getCoursesBySchool } from "@/lib/firestore/courses";
import { TmsUser, UserRole, Course } from "@/types";
import { TECH_ADMIN_ASSIGNABLE_ROLES, ROLE_LABELS } from "@/lib/roles";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

const ROLE_COLORS: Record<UserRole, string> = {
  student: "bg-blue-100 text-blue-700",
  adviser: "bg-green-100 text-green-700",
  panel: "bg-purple-100 text-purple-700",
  adviser_panel: "bg-emerald-100 text-emerald-700",
  admin: "bg-red-100 text-red-700",
  tech_admin: "bg-orange-100 text-orange-700",
};

export default function TechAdminUsersPage() {
  const { tmsUser } = useAuth();
  const [users, setUsers] = useState<TmsUser[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [filtered, setFiltered] = useState<TmsUser[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

  useEffect(() => {
    if (!tmsUser) return;
    if (!tmsUser.schoolId) { setLoading(false); return; }
    Promise.all([
      getUsersBySchool(tmsUser.schoolId),
      getCoursesBySchool(tmsUser.schoolId),
    ]).then(([u, c]) => {
      setUsers(u);
      setFiltered(u);
      setCourses(c);
      setLoading(false);
    });
  }, [tmsUser]);

  useEffect(() => {
    const q = search.toLowerCase();
    setFiltered(
      users.filter(
        (u) =>
          u.displayName.toLowerCase().includes(q) ||
          u.email.toLowerCase().includes(q)
      )
    );
  }, [search, users]);

  async function handleRoleChange(uid: string, role: UserRole) {
    setUpdating(uid);
    try {
      await updateUserRole(uid, role);
      setUsers((prev) => prev.map((u) => u.uid === uid ? { ...u, role } : u));
      toast.success("Role updated.");
    } catch {
      toast.error("Failed to update role.");
    } finally {
      setUpdating(null);
    }
  }

  const courseMap = Object.fromEntries(courses.map((c) => [c.id, c.name]));

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">All Users</h1>
        <Input
          placeholder="Search by name or email…"
          className="w-72"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{filtered.length} Users</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-14 w-full" />)}
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.map((user) => (
                <div key={user.uid} className="flex items-center justify-between p-3 border rounded-lg gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <Avatar className="w-9 h-9 shrink-0">
                      <AvatarFallback className="text-xs bg-slate-100 text-slate-600">
                        {user.displayName.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{user.displayName}</p>
                      <p className="text-xs text-slate-500 truncate">
                        {user.email}
                        {user.courseId ? ` · ${courseMap[user.courseId] ?? user.courseId}` : ""}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge className={`text-xs ${ROLE_COLORS[user.role]}`} variant="outline">
                      {ROLE_LABELS[user.role]}
                    </Badge>
                    <Select
                      value={user.role}
                      onValueChange={(v) => handleRoleChange(user.uid, v as UserRole)}
                      disabled={updating === user.uid}
                    >
                      <SelectTrigger className="w-40 h-7 text-xs">
                        <SelectValue>
                          {(value) =>
                            typeof value === "string"
                              ? (ROLE_LABELS[value as UserRole] ?? value)
                              : "Select role"
                          }
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {TECH_ADMIN_ASSIGNABLE_ROLES.map((r) => (
                          <SelectItem key={r} value={r} className="text-xs">
                            {ROLE_LABELS[r]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
