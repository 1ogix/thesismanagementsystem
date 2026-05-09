"use client";

import { useEffect, useState } from "react";
import { getAllTheses } from "@/lib/firestore/theses";
import { createSchedule, updateSchedule, getAllSchedules, deleteSchedule } from "@/lib/firestore/schedules";
import { createNotificationsBulk } from "@/lib/firestore/notifications";
import { getGroup } from "@/lib/firestore/groups";
import { getUsersByIds, getUsersByCapability, getUserDocument } from "@/lib/firestore/users";
import { ROLE_LABELS } from "@/lib/roles";
import { TmsUser } from "@/types";
import { Thesis, DefenseSchedule, STAGE_LABELS } from "@/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { CalendarDays, Pencil, X, Check, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Timestamp } from "firebase/firestore";

export default function SchedulesPage() {
  const [theses, setTheses] = useState<Thesis[]>([]);
  const [schedules, setSchedules] = useState<DefenseSchedule[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedThesis, setSelectedThesis] = useState("");
  const [selectedStage, setSelectedStage] = useState<"proposal" | "pre_oral" | "final_oral">("proposal");
  const [dateTime, setDateTime] = useState("");
  const [venue, setVenue] = useState("");
  const [saving, setSaving] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDateTime, setEditDateTime] = useState("");
  const [editVenue, setEditVenue] = useState("");
  const [editSaving, setEditSaving] = useState(false);

  const [groupMembers, setGroupMembers] = useState<TmsUser[]>([]);
  const [assignedAdviser, setAssignedAdviser] = useState<TmsUser | null>(null);
  const [availablePanelists, setAvailablePanelists] = useState<TmsUser[]>([]);
  const [selectedPanelIds, setSelectedPanelIds] = useState<string[]>([]);
  const [participantsLoading, setParticipantsLoading] = useState(false);

  useEffect(() => {
    Promise.all([getAllTheses(), getAllSchedules(), getUsersByCapability("panel")]).then(([ts, sc, panelists]) => {
      setTheses(ts);
      setSchedules(sc);
      setAvailablePanelists(panelists);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    if (!selectedThesis) {
      setGroupMembers([]);
      setAssignedAdviser(null);
      setSelectedPanelIds([]);
      return;
    }
    const thesis = theses.find((t) => t.id === selectedThesis);
    if (!thesis) return;
    setParticipantsLoading(true);
    getGroup(thesis.groupId).then(async (group) => {
      if (!group) { setParticipantsLoading(false); return; }
      const members = await getUsersByIds(group.members);
      setGroupMembers(members);
      if (group.adviserId) {
        const adviser = await getUserDocument(group.adviserId);
        setAssignedAdviser(adviser);
      } else {
        setAssignedAdviser(null);
      }
      setParticipantsLoading(false);
    });
  }, [selectedThesis, theses]);

  async function handleSchedule(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedThesis) { toast.error("Select a thesis."); return; }
    setSaving(true);
    try {
      const thesis = theses.find((t) => t.id === selectedThesis);
      if (!thesis) throw new Error("Thesis not found");

      const scheduledAt = Timestamp.fromDate(new Date(dateTime));

      const scheduleId = await createSchedule({
        thesisId: selectedThesis,
        stage: selectedStage,
        scheduledAt,
        venue: venue.trim(),
        panelIds: selectedPanelIds,
      });

      // Notify all involved parties
      const group = await getGroup(thesis.groupId);
      const notifyUids = [
        ...(group?.members ?? []),
        ...(group?.adviserId ? [group.adviserId] : []),
        ...selectedPanelIds,
      ];

      await createNotificationsBulk(
        [...new Set(notifyUids)],
        "schedule",
        `Defense scheduled: "${thesis.title}" — ${STAGE_LABELS[selectedStage]} on ${new Date(dateTime).toLocaleDateString("en-PH", { dateStyle: "long" })} at ${venue}`,
        selectedThesis
      );

      const newSchedule: DefenseSchedule = {
        id: scheduleId,
        thesisId: selectedThesis,
        stage: selectedStage,
        scheduledAt,
        venue: venue.trim(),
        panelIds: selectedPanelIds,
        createdAt: Timestamp.now(),
      };
      setSchedules((prev) => [newSchedule, ...prev]);

      toast.success("Defense scheduled and all parties notified.");
      setDateTime("");
      setVenue("");
      setSelectedPanelIds([]);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to schedule.");
    } finally {
      setSaving(false);
    }
  }

  function startEdit(s: DefenseSchedule) {
    const dt = s.scheduledAt.toDate();
    const pad = (n: number) => String(n).padStart(2, "0");
    const local = `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}T${pad(dt.getHours())}:${pad(dt.getMinutes())}`;
    setEditingId(s.id);
    setEditDateTime(local);
    setEditVenue(s.venue);
  }

  async function handleSaveEdit(s: DefenseSchedule) {
    if (!editDateTime || !editVenue.trim()) {
      toast.error("Date/time and venue are required.");
      return;
    }
    setEditSaving(true);
    try {
      const scheduledAt = Timestamp.fromDate(new Date(editDateTime));
      await updateSchedule(s.id, { scheduledAt, venue: editVenue.trim() });

      const thesis = thesisMap[s.thesisId];
      const group = thesis ? await getGroup(thesis.groupId) : null;
      const notifyUids = [
        ...(group?.members ?? []),
        ...(group?.adviserId ? [group.adviserId] : []),
        ...s.panelIds,
      ];
      await createNotificationsBulk(
        [...new Set(notifyUids)],
        "schedule",
        `Defense rescheduled: "${thesis?.title}" — ${STAGE_LABELS[s.stage]} moved to ${new Date(editDateTime).toLocaleDateString("en-PH", { dateStyle: "long" })} at ${editVenue.trim()}`,
        s.thesisId
      );

      setSchedules((prev) =>
        prev.map((sc) =>
          sc.id === s.id ? { ...sc, scheduledAt, venue: editVenue.trim() } : sc
        )
      );
      setEditingId(null);
      toast.success("Schedule updated and all parties notified.");
    } catch {
      toast.error("Failed to update schedule.");
    } finally {
      setEditSaving(false);
    }
  }

  async function handleDelete(s: DefenseSchedule) {
    try {
      await deleteSchedule(s.id);

      const thesis = thesisMap[s.thesisId];
      const group = thesis ? await getGroup(thesis.groupId) : null;
      const notifyUids = [
        ...(group?.members ?? []),
        ...(group?.adviserId ? [group.adviserId] : []),
        ...s.panelIds,
      ];
      await createNotificationsBulk(
        [...new Set(notifyUids)],
        "schedule",
        `Defense canceled: "${thesis?.title ?? "Unknown thesis"}" — ${STAGE_LABELS[s.stage]} scheduled on ${s.scheduledAt.toDate().toLocaleDateString("en-PH", { dateStyle: "long" })} at ${s.venue} has been removed.`,
        s.thesisId
      );

      setSchedules((prev) => prev.filter((sc) => sc.id !== s.id));
      toast.success("Schedule deleted and all parties notified.");
    } catch {
      toast.error("Failed to delete schedule.");
    }
  }

  const thesisMap = Object.fromEntries(theses.map((t) => [t.id, t]));
  const thesisLabelById = Object.fromEntries(
    theses.map((t) => [t.id, t.title || "Untitled thesis"]),
  );

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">Defense Schedules</h1>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Schedule a Defense</CardTitle>
          <CardDescription>
            Set the date, time, and venue for a thesis defense.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSchedule} className="space-y-4">
            <div className="space-y-1">
              <Label>Thesis</Label>
              <Select onValueChange={(v) => setSelectedThesis(v ?? "")} value={selectedThesis}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a thesis...">
                    {(value) =>
                      typeof value === "string" && value
                        ? (thesisLabelById[value] ?? "Untitled thesis")
                        : "Select a thesis..."
                    }
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {theses.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      <span className="truncate max-w-[280px] block">{t.title}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label>Defense Stage</Label>
              <Select
                onValueChange={(v) => setSelectedStage(v as "proposal" | "pre_oral" | "final_oral")}
                value={selectedStage}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(["proposal", "pre_oral", "final_oral"] as const).map((s) => (
                    <SelectItem key={s} value={s}>{STAGE_LABELS[s]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Participants */}
            {selectedThesis && (
              <div className="border rounded-lg p-4 bg-slate-50 space-y-4">
                <p className="text-sm font-semibold text-slate-700">Participants</p>

                {participantsLoading ? (
                  <p className="text-xs text-slate-400">Loading participants…</p>
                ) : (
                  <>
                    {/* Students */}
                    <div>
                      <p className="text-xs font-medium text-slate-500 mb-2">Students</p>
                      {groupMembers.length === 0 ? (
                        <p className="text-xs text-slate-400">No group members found.</p>
                      ) : (
                        <div className="space-y-1">
                          {groupMembers.map((m) => (
                            <div key={m.uid} className="flex items-center gap-2 text-sm text-slate-700">
                              <span className="w-2 h-2 rounded-full bg-blue-400 shrink-0" />
                              {m.displayName}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Adviser */}
                    <div>
                      <p className="text-xs font-medium text-slate-500 mb-2">Adviser</p>
                      {assignedAdviser ? (
                        <div className="flex items-center gap-2 text-sm text-slate-700">
                          <span className="w-2 h-2 rounded-full bg-green-400 shrink-0" />
                          {assignedAdviser.displayName}
                        </div>
                      ) : (
                        <p className="text-xs text-slate-400">No adviser assigned to this thesis.</p>
                      )}
                    </div>

                    {/* Panelists */}
                    <div>
                      <p className="text-xs font-medium text-slate-500 mb-2">Panelists</p>
                      {availablePanelists.length === 0 ? (
                        <p className="text-xs text-slate-400">No panel-capable users found.</p>
                      ) : (
                        <div className="space-y-2">
                          {availablePanelists.map((p) => (
                            <label
                              key={p.uid}
                              className="flex items-center gap-2.5 text-sm text-slate-700 cursor-pointer select-none"
                            >
                              <input
                                type="checkbox"
                                className="rounded border-slate-300 accent-blue-600"
                                checked={selectedPanelIds.includes(p.uid)}
                                onChange={(e) =>
                                  setSelectedPanelIds((prev) =>
                                    e.target.checked
                                      ? [...prev, p.uid]
                                      : prev.filter((id) => id !== p.uid)
                                  )
                                }
                              />
                              <span>{p.displayName}</span>
                              <span className="text-xs text-slate-400">{ROLE_LABELS[p.role]}</span>
                            </label>
                          ))}
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Date & Time</Label>
                <Input
                  type="datetime-local"
                  value={dateTime}
                  onChange={(e) => setDateTime(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1">
                <Label>Venue / Room</Label>
                <Input
                  placeholder="e.g. Room 301, CS Building"
                  value={venue}
                  onChange={(e) => setVenue(e.target.value)}
                  required
                />
              </div>
            </div>

            <Button
              type="submit"
              className="bg-blue-600 hover:bg-blue-500"
              disabled={saving}
            >
              Schedule Defense & Notify All
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Upcoming schedules */}
      <div>
        <h2 className="font-semibold text-slate-700 mb-3">All Schedules</h2>
        {loading ? (
          <Skeleton className="h-32 w-full" />
        ) : schedules.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-8 text-center text-slate-400 text-sm">
              No schedules yet.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {schedules.map((s) => (
              <Card key={s.id}>
                <CardContent className="py-4">
                  {editingId === s.id ? (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <CalendarDays className="w-5 h-5 text-blue-500 shrink-0" />
                        <p className="text-sm font-medium truncate">{thesisMap[s.thesisId]?.title ?? "—"}</p>
                        <Badge variant="outline" className="text-xs shrink-0 ml-auto">{STAGE_LABELS[s.stage]}</Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <Label className="text-xs">Date & Time</Label>
                          <Input
                            type="datetime-local"
                            value={editDateTime}
                            onChange={(e) => setEditDateTime(e.target.value)}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Venue / Room</Label>
                          <Input
                            value={editVenue}
                            onChange={(e) => setEditVenue(e.target.value)}
                            placeholder="e.g. Room 301"
                          />
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          className="bg-green-600 hover:bg-green-500"
                          onClick={() => handleSaveEdit(s)}
                          disabled={editSaving}
                        >
                          <Check className="w-3 h-3 mr-1" /> Save & Notify
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setEditingId(null)}
                          disabled={editSaving}
                        >
                          <X className="w-3 h-3 mr-1" /> Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <CalendarDays className="w-5 h-5 text-blue-500 shrink-0" />
                        <div>
                          <p className="text-sm font-medium">
                            {thesisMap[s.thesisId]?.title ?? "—"}
                          </p>
                          <p className="text-xs text-slate-500">
                            {s.scheduledAt.toDate().toLocaleString("en-PH")} · {s.venue}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Badge variant="outline" className="text-xs">
                          {STAGE_LABELS[s.stage]}
                        </Badge>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="w-7 h-7"
                          onClick={() => startEdit(s)}
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger className="inline-flex items-center justify-center w-7 h-7 rounded-md text-slate-500 hover:text-red-600 hover:bg-red-50 transition-colors">
                            <Trash2 className="w-3.5 h-3.5" />
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete this schedule?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This will permanently remove the{" "}
                                <span className="font-medium">{STAGE_LABELS[s.stage]}</span> defense
                                scheduled on{" "}
                                <span className="font-medium">
                                  {s.scheduledAt.toDate().toLocaleDateString("en-PH", { dateStyle: "long" })}
                                </span>{" "}
                                at <span className="font-medium">{s.venue}</span>. Students, advisers,
                                and panel members will be notified.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                className="bg-red-600 hover:bg-red-500"
                                onClick={() => handleDelete(s)}
                              >
                                Delete & Notify
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
