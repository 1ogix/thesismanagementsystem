"use client";

import { useEffect, useState } from "react";
import { getAllUsers, updateUserRole } from "@/lib/firestore/users";
import { TmsUser, UserRole } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
  admin: "bg-red-100 text-red-700",
};

export default function UsersPage() {
  const [users, setUsers] = useState<TmsUser[]>([]);
  const [filtered, setFiltered] = useState<TmsUser[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

  useEffect(() => {
    getAllUsers().then((u) => {
      setUsers(u);
      setFiltered(u);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    const q = search.toLowerCase();
    setFiltered(
      users.filter(
        (u) =>
          u.displayName.toLowerCase().includes(q) ||
          u.email.toLowerCase().includes(q) ||
          u.department.toLowerCase().includes(q)
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

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Users</h1>
        <Input
          placeholder="Search by name, email, department..."
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
                <div
                  key={user.uid}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="w-9 h-9">
                      <AvatarFallback className="text-xs bg-slate-100 text-slate-600">
                        {user.displayName.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-medium">{user.displayName}</p>
                      <p className="text-xs text-slate-500">{user.email} · {user.department}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge className={`text-xs ${ROLE_COLORS[user.role]}`} variant="outline">
                      {user.role}
                    </Badge>
                    <Select
                      defaultValue={user.role}
                      onValueChange={(v) => handleRoleChange(user.uid, v as UserRole)}
                      disabled={updating === user.uid}
                    >
                      <SelectTrigger className="w-28 h-7 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {(["student", "adviser", "panel", "admin"] as UserRole[]).map((r) => (
                          <SelectItem key={r} value={r} className="text-xs capitalize">
                            {r}
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
