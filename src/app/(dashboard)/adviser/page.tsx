"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { getApplicationsByAdviser } from "@/lib/firestore/adviser";
import { getThesis } from "@/lib/firestore/theses";
import { AdviserApplication, Thesis, STAGE_LABELS } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/thesis/StatusBadge";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { FileText, ArrowRight, Eye } from "lucide-react";

interface AssignedThesis {
  application: AdviserApplication;
  thesis: Thesis | null;
}

export default function AdviserDashboard() {
  const { tmsUser } = useAuth();
  const [items, setItems] = useState<AssignedThesis[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!tmsUser) return;
    getApplicationsByAdviser(tmsUser.uid).then(async (apps) => {
      const approved = apps.filter((a) => a.status === "approved");
      const withThesis = await Promise.all(
        approved.map(async (app) => ({
          application: app,
          thesis: await getThesis(app.thesisId),
        }))
      );
      setItems(withThesis.filter((item) => item.thesis !== null));
      setLoading(false);
    });
  }, [tmsUser]);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Adviser Dashboard</h1>
        <p className="text-slate-500 mt-1">Manage your assigned thesis groups.</p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="pt-4">
            <p className="text-2xl font-bold text-blue-600">{items.length}</p>
            <p className="text-xs text-slate-500">Assigned Theses</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-2xl font-bold text-orange-500">
              {items.filter((i) => i.thesis?.stageStatus === "submitted").length}
            </p>
            <p className="text-xs text-slate-500">Pending Review</p>
          </CardContent>
        </Card>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2].map((i) => <Skeleton key={i} className="h-24 w-full" />)}
        </div>
      ) : items.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <FileText className="w-8 h-8 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 text-sm">No assigned theses yet.</p>
            <Link href="/adviser/available" className="mt-3 inline-block">
              <Button variant="outline" size="sm">
                <Eye className="w-4 h-4 mr-2" />
                Browse Open Theses
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {items.map(({ application, thesis }) => (
            <Card key={application.id}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <CardTitle className="text-base">
                    {thesis?.title ?? "Loading..."}
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    {thesis && <StatusBadge status={thesis.stageStatus} />}
                    <Badge variant="outline" className="capitalize text-xs">
                      {application.type}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="flex items-center justify-between">
                <p className="text-sm text-slate-500">
                  {thesis ? STAGE_LABELS[thesis.currentStage] : "—"}
                </p>
                <Link href={`/adviser/thesis/${application.thesisId}`}>
                  <Button variant="outline" size="sm">
                    Review <ArrowRight className="w-3 h-3 ml-1" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <div className="flex justify-end">
        <Link href="/adviser/available">
          <Button variant="outline">
            <Eye className="w-4 h-4 mr-2" />
            Browse Open Theses
          </Button>
        </Link>
      </div>
    </div>
  );
}
