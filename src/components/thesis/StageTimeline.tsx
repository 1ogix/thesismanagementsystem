import { ThesisStage, StageStatus, STAGE_LABELS } from "@/types";
import { Check, Circle, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

const STAGE_ORDER: ThesisStage[] = ["proposal", "pre_oral", "final_oral", "manuscript"];

function stageState(
  stage: ThesisStage,
  currentStage: ThesisStage,
  stageStatus: StageStatus
): "done" | "current" | "upcoming" {
  const si = STAGE_ORDER.indexOf(stage);
  const ci = STAGE_ORDER.indexOf(currentStage);
  if (si < ci) return "done";
  if (si === ci) return "current";
  return "upcoming";
}

export function StageTimeline({
  currentStage,
  stageStatus,
}: {
  currentStage: ThesisStage;
  stageStatus: StageStatus;
}) {
  return (
    <div className="flex items-center gap-0">
      {STAGE_ORDER.map((stage, i) => {
        const state = stageState(stage, currentStage, stageStatus);
        return (
          <div key={stage} className="flex items-center">
            <div className="flex flex-col items-center gap-1">
              <div
                className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center border-2 text-xs font-medium",
                  state === "done" && "bg-green-500 border-green-500 text-white",
                  state === "current" && "bg-blue-600 border-blue-600 text-white",
                  state === "upcoming" && "bg-white border-slate-300 text-slate-400"
                )}
              >
                {state === "done" ? (
                  <Check className="w-4 h-4" />
                ) : state === "current" ? (
                  <Clock className="w-4 h-4" />
                ) : (
                  <Circle className="w-3 h-3" />
                )}
              </div>
              <span
                className={cn(
                  "text-xs text-center max-w-[80px] leading-tight",
                  state === "current" ? "text-blue-600 font-medium" : "text-slate-400"
                )}
              >
                {STAGE_LABELS[stage]}
              </span>
            </div>
            {i < STAGE_ORDER.length - 1 && (
              <div
                className={cn(
                  "h-0.5 w-12 mt-[-1.25rem]",
                  STAGE_ORDER.indexOf(currentStage) > i
                    ? "bg-green-400"
                    : "bg-slate-200"
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
