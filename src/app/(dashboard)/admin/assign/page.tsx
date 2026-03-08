"use client";

import { useEffect, useState } from "react";
import { getAllTheses, getThesis, updateThesisStatus } from "@/lib/firestore/theses";
import { getUsersByRole } from "@/lib/firestore/users";
import { assignAdviserByAdmin, getApplicationsByThesis, updateApplicationStatus } from "@/lib/firestore/adviser";
import { assignPanelMember, getPanelByThesis } from "@/lib/firestore/panel";
import { assignAdviserToGroup, getGroup } from "@/lib/firestore/groups";
import { createNotificationsBulk } from "@/lib/firestore/notifications";
import { Thesis, TmsUser, ThesisStage, STAGE_LABELS } from "@/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { StatusBadge } from "@/components/thesis/StatusBadge";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { CheckCircle } from "lucide-react";

export default function AssignPage() {
  const [theses, setTheses] = useState<Thesis[]>([]);
  const [advisers, setAdvisers] = useState<TmsUser[]>([]);
  const [panelists, setPanelists] = useState<TmsUser[]>([]);
  const [loading, setLoading] = useState(true);

  // selected values
  const [selectedThesis, setSelectedThesis] = useState("");
  const [selectedAdviser, setSelectedAdviser] = useState("");
  const [selectedPanel, setSelectedPanel] = useState("");
  const [selectedStage, setSelectedStage] = useState<ThesisStage>("proposal");

  // volunteer applications
  const [applications, setApplications] = useState<{ id: string; adviserId: string; adviserName: string }[]>([]);

  const [assigning, setAssigning] = useState(false);

  useEffect(() => {
    Promise.all([
      getAllTheses(),
      getUsersByRole("adviser"),
      getUsersByRole("panel"),
    ]).then(([ts, adv, pan]) => {
      setTheses(ts);
      setAdvisers(adv);
      setPanelists(pan);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    if (!selectedThesis) { setApplications([]); return; }
    getApplicationsByThesis(selectedThesis).then(async (apps) => {
      const pending = apps.filter((a) => a.status === "pending");
      const withNames = await Promise.all(
        pending.map(async (a) => {
          const adv = advisers.find((u) => u.uid === a.adviserId);
          return { id: a.id, adviserId: a.adviserId, adviserName: adv?.displayName ?? a.adviserId };
        })
      );
      setApplications(withNames);
    });
  }, [selectedThesis, advisers]);

  async function handleAssignAdviser() {
    if (!selectedThesis || !selectedAdviser) {
      toast.error("Select a thesis and adviser.");
      return;
    }
    setAssigning(true);
    try {
      const thesis = await getThesis(selectedThesis);
      if (!thesis) throw new Error("Thesis not found");

      await assignAdviserByAdmin(selectedThesis, selectedAdviser);
      await assignAdviserToGroup(thesis.groupId, selectedAdviser);

      const group = await getGroup(thesis.groupId);
      if (group) {
        const adviserUser = advisers.find((a) => a.uid === selectedAdviser);
        await createNotificationsBulk(
          [...group.members, selectedAdviser],
          "assignment",
          `Adviser ${adviserUser?.displayName ?? ""} has been assigned to "${thesis.title}"`,
          selectedThesis
        );
      }
      toast.success("Adviser assigned successfully.");
      setSelectedAdviser("");
    } catch {
      toast.error("Failed to assign adviser.");
    } finally {
      setAssigning(false);
    }
  }

  async function handleApproveVolunteer(appId: string, adviserId: string) {
    setAssigning(true);
    try {
      await updateApplicationStatus(appId, "approved");
      const thesis = await getThesis(selectedThesis);
      if (thesis) {
        await assignAdviserToGroup(thesis.groupId, adviserId);
        const group = await getGroup(thesis.groupId);
        if (group) {
          const adviserUser = advisers.find((a) => a.uid === adviserId);
          await createNotificationsBulk(
            [...group.members, adviserId],
            "assignment",
            `Adviser ${adviserUser?.displayName ?? ""} approved for "${thesis.title}"`,
            selectedThesis
          );
        }
      }
      setApplications((prev) => prev.filter((a) => a.id !== appId));
      toast.success("Volunteer approved.");
    } catch {
      toast.error("Failed to approve.");
    } finally {
      setAssigning(false);
    }
  }

  async function handleAssignPanel() {
    if (!selectedThesis || !selectedPanel) {
      toast.error("Select a thesis and panel member.");
      return;
    }
    setAssigning(true);
    try {
      const thesis = await getThesis(selectedThesis);
      if (!thesis) throw new Error("Thesis not found");

      // Check not already assigned
      const existing = await getPanelByThesis(selectedThesis, selectedStage);
      if (existing.some((p) => p.panelMemberId === selectedPanel)) {
        toast.error("This panel member is already assigned for this stage.");
        return;
      }

      await assignPanelMember(selectedThesis, selectedPanel, selectedStage, "admin");

      const group = await getGroup(thesis.groupId);
      if (group) {
        const panelUser = panelists.find((p) => p.uid === selectedPanel);
        await createNotificationsBulk(
          [...group.members, selectedPanel],
          "assignment",
          `${panelUser?.displayName ?? "A panelist"} assigned to "${thesis.title}" — ${STAGE_LABELS[selectedStage]}`,
          selectedThesis
        );
      }

      toast.success("Panel member assigned.");
      setSelectedPanel("");
    } catch {
      toast.error("Failed to assign panel member.");
    } finally {
      setAssigning(false);
    }
  }

  if (loading) return <Skeleton className="h-64 w-full max-w-3xl" />;

  const thesisOptions = theses.map((t) => ({ value: t.id, label: t.title }));
  const selectedThesisData = theses.find((t) => t.id === selectedThesis);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">Assignments</h1>

      <Tabs defaultValue="adviser">
        <TabsList>
          <TabsTrigger value="adviser">Assign Adviser</TabsTrigger>
          <TabsTrigger value="panel">Assign Panel</TabsTrigger>
        </TabsList>

        <TabsContent value="adviser" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Assign Adviser to Thesis</CardTitle>
              <CardDescription>
                Directly assign an adviser or approve volunteer applications.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1">
                <label className="text-sm font-medium">Select Thesis</label>
                <Select onValueChange={(v) => setSelectedThesis(v ?? "")} value={selectedThesis}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a thesis..." />
                  </SelectTrigger>
                  <SelectContent>
                    {thesisOptions.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        <span className="truncate max-w-[280px] block">{t.label}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedThesisData && (
                <div className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg">
                  <StatusBadge status={selectedThesisData.stageStatus} />
                  <Badge variant="outline" className="text-xs">
                    {STAGE_LABELS[selectedThesisData.currentStage]}
                  </Badge>
                </div>
              )}

              {/* Volunteer applications */}
              {applications.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-slate-700">Volunteer Applications</p>
                  {applications.map((app) => (
                    <div key={app.id} className="flex items-center justify-between p-3 border rounded-lg bg-yellow-50 border-yellow-200">
                      <p className="text-sm font-medium">{app.adviserName}</p>
                      <Button
                        size="sm"
                        className="bg-green-600 hover:bg-green-500"
                        onClick={() => handleApproveVolunteer(app.id, app.adviserId)}
                        disabled={assigning}
                      >
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Approve
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              <div className="space-y-1">
                <label className="text-sm font-medium">Select Adviser</label>
                <Select onValueChange={(v) => setSelectedAdviser(v ?? "")} value={selectedAdviser}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose an adviser..." />
                  </SelectTrigger>
                  <SelectContent>
                    {advisers.map((a) => (
                      <SelectItem key={a.uid} value={a.uid}>
                        {a.displayName} — {a.department}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button
                className="bg-blue-600 hover:bg-blue-500"
                onClick={handleAssignAdviser}
                disabled={assigning || !selectedThesis || !selectedAdviser}
              >
                Assign Adviser
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="panel" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Assign Panel Member</CardTitle>
              <CardDescription>
                Assign panelists per thesis and per defense stage.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1">
                <label className="text-sm font-medium">Select Thesis</label>
                <Select onValueChange={(v) => setSelectedThesis(v ?? "")} value={selectedThesis}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a thesis..." />
                  </SelectTrigger>
                  <SelectContent>
                    {thesisOptions.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        <span className="truncate max-w-[280px] block">{t.label}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium">Defense Stage</label>
                <Select
                  onValueChange={(v) => setSelectedStage(v as ThesisStage)}
                  value={selectedStage}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(["proposal", "pre_oral", "final_oral"] as ThesisStage[]).map((s) => (
                      <SelectItem key={s} value={s}>{STAGE_LABELS[s]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium">Select Panel Member</label>
                <Select onValueChange={(v) => setSelectedPanel(v ?? "")} value={selectedPanel}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a panelist..." />
                  </SelectTrigger>
                  <SelectContent>
                    {panelists.map((p) => (
                      <SelectItem key={p.uid} value={p.uid}>
                        {p.displayName} — {p.department}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button
                className="bg-blue-600 hover:bg-blue-500"
                onClick={handleAssignPanel}
                disabled={assigning || !selectedThesis || !selectedPanel}
              >
                Assign Panel Member
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
