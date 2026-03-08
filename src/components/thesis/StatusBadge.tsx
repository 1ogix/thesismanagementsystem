import { Badge } from "@/components/ui/badge";
import { StageStatus } from "@/types";
import { cn } from "@/lib/utils";

const STATUS_STYLES: Record<StageStatus, string> = {
  draft: "bg-slate-100 text-slate-600 border-slate-200",
  submitted: "bg-blue-100 text-blue-700 border-blue-200",
  under_review: "bg-yellow-100 text-yellow-700 border-yellow-200",
  scheduled: "bg-purple-100 text-purple-700 border-purple-200",
  evaluated: "bg-indigo-100 text-indigo-700 border-indigo-200",
  approved: "bg-green-100 text-green-700 border-green-200",
  revision_required: "bg-orange-100 text-orange-700 border-orange-200",
  rejected: "bg-red-100 text-red-700 border-red-200",
  completed: "bg-emerald-100 text-emerald-700 border-emerald-200",
};

const STATUS_LABELS: Record<StageStatus, string> = {
  draft: "Draft",
  submitted: "Submitted",
  under_review: "Under Review",
  scheduled: "Scheduled",
  evaluated: "Evaluated",
  approved: "Approved",
  revision_required: "Revision Required",
  rejected: "Rejected",
  completed: "Completed",
};

export function StatusBadge({ status }: { status: StageStatus }) {
  return (
    <Badge
      variant="outline"
      className={cn("text-xs font-medium", STATUS_STYLES[status])}
    >
      {STATUS_LABELS[status]}
    </Badge>
  );
}
