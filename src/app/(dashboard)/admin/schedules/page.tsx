"use client";

import { useEffect, useState } from "react";
import { getAllTheses } from "@/lib/firestore/theses";
import { getPanelByThesis } from "@/lib/firestore/panel";
import { createSchedule, getAllSchedules } from "@/lib/firestore/schedules";
import { createNotificationsBulk } from "@/lib/firestore/notifications";
import { getGroup } from "@/lib/firestore/groups";
import { Thesis, DefenseSchedule, ThesisStage, STAGE_LABELS } from "@/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { CalendarDays } from "lucide-react";
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

  useEffect(() => {
    Promise.all([getAllTheses(), getAllSchedules()]).then(([ts, sc]) => {
      setTheses(ts);
      setSchedules(sc);
      setLoading(false);
    });
  }, []);

  async function handleSchedule(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedThesis) { toast.error("Select a thesis."); return; }
    setSaving(true);
    try {
      const thesis = theses.find((t) => t.id === selectedThesis);
      if (!thesis) throw new Error("Thesis not found");

      const panelAssignments = await getPanelByThesis(selectedThesis, selectedStage);
      const panelIds = panelAssignments.map((p) => p.panelMemberId);

      const scheduledAt = Timestamp.fromDate(new Date(dateTime));

      const scheduleId = await createSchedule({
        thesisId: selectedThesis,
        stage: selectedStage,
        scheduledAt,
        venue: venue.trim(),
        panelIds,
      });

      // Notify all involved parties
      const group = await getGroup(thesis.groupId);
      const notifyUids = [
        ...(group?.members ?? []),
        ...(group?.adviserId ? [group.adviserId] : []),
        ...panelIds,
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
        panelIds,
        createdAt: Timestamp.now(),
      };
      setSchedules((prev) => [newSchedule, ...prev]);

      toast.success("Defense scheduled and all parties notified.");
      setDateTime("");
      setVenue("");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to schedule.");
    } finally {
      setSaving(false);
    }
  }

  const thesisMap = Object.fromEntries(theses.map((t) => [t.id, t]));

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
                  <SelectValue placeholder="Select a thesis..." />
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
                <CardContent className="flex items-center justify-between py-4">
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
                  <Badge variant="outline" className="text-xs shrink-0">
                    {STAGE_LABELS[s.stage]}
                  </Badge>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
