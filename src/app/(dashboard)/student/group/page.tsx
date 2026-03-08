"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import {
  createGroup, getGroupByMember, addMemberToGroup,
} from "@/lib/firestore/groups";
import { getUsersByIds } from "@/lib/firestore/users";
import { Group, TmsUser } from "@/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { UserPlus, Users } from "lucide-react";
import { toast } from "sonner";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";

export default function GroupPage() {
  const { tmsUser } = useAuth();
  const [group, setGroup] = useState<Group | null | undefined>(undefined);
  const [members, setMembers] = useState<TmsUser[]>([]);
  const [groupName, setGroupName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!tmsUser) return;
    getGroupByMember(tmsUser.uid).then((g) => {
      setGroup(g);
      if (g) getUsersByIds(g.members).then(setMembers);
    });
  }, [tmsUser]);

  async function handleCreateGroup(e: React.FormEvent) {
    e.preventDefault();
    if (!tmsUser) return;
    setLoading(true);
    try {
      const gid = await createGroup(groupName.trim(), tmsUser.uid);
      const g = await getGroupByMember(tmsUser.uid);
      setGroup(g);
      setMembers([tmsUser]);
      toast.success("Group created!");
      void gid;
    } catch {
      toast.error("Failed to create group.");
    } finally {
      setLoading(false);
    }
  }

  async function handleInviteMember(e: React.FormEvent) {
    e.preventDefault();
    if (!group) return;
    setLoading(true);
    try {
      // Find user by email
      const q = query(
        collection(db, "users"),
        where("email", "==", inviteEmail.trim()),
        where("role", "==", "student")
      );
      const snap = await getDocs(q);
      if (snap.empty) {
        toast.error("No student found with that email.");
        return;
      }
      const invited = snap.docs[0].data() as TmsUser;
      if (group.members.includes(invited.uid)) {
        toast.error("This student is already in the group.");
        return;
      }
      await addMemberToGroup(group.id, invited.uid);
      setMembers((prev) => [...prev, invited]);
      setInviteEmail("");
      toast.success(`${invited.displayName} added to group!`);
    } catch {
      toast.error("Failed to add member.");
    } finally {
      setLoading(false);
    }
  }

  const isLeader = group?.leaderId === tmsUser?.uid;

  if (group === undefined) {
    return <Skeleton className="h-64 w-full max-w-2xl" />;
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">My Group</h1>

      {!group ? (
        <Card>
          <CardHeader>
            <CardTitle>Create a Group</CardTitle>
            <CardDescription>
              Groups are how students collaborate on a thesis. You&apos;ll be the group leader.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreateGroup} className="space-y-4">
              <div className="space-y-1">
                <Label>Group Name</Label>
                <Input
                  placeholder="e.g. Team Alpha - BSCS 2026"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" className="bg-blue-600 hover:bg-blue-500" disabled={loading}>
                Create Group
              </Button>
            </form>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-blue-500" />
                  {group.name}
                </CardTitle>
                <Badge variant="outline" className="capitalize">{group.status}</Badge>
              </div>
              <CardDescription>
                {group.adviserId
                  ? "Adviser has been assigned."
                  : "Waiting for adviser assignment."}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm font-medium text-slate-700 mb-3">Members</p>
                <div className="space-y-2">
                  {members.map((m) => (
                    <div key={m.uid} className="flex items-center gap-3">
                      <Avatar className="w-8 h-8">
                        <AvatarFallback className="text-xs bg-blue-100 text-blue-700">
                          {m.displayName.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium">{m.displayName}</p>
                        <p className="text-xs text-slate-500">{m.email}</p>
                      </div>
                      {m.uid === group.leaderId && (
                        <Badge className="ml-auto text-xs" variant="secondary">Leader</Badge>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {isLeader && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <UserPlus className="w-4 h-4 text-blue-500" />
                  Invite Member
                </CardTitle>
                <CardDescription>
                  Add a student to your group by their registered email.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleInviteMember} className="flex gap-2">
                  <Input
                    type="email"
                    placeholder="student@email.com"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    required
                    className="flex-1"
                  />
                  <Button type="submit" disabled={loading} className="bg-blue-600 hover:bg-blue-500">
                    Add
                  </Button>
                </form>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
