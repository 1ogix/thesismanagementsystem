"use client";

import { InlineComment } from "@/types";
import { Button } from "@/components/ui/button";
import { CheckCheck, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";

interface CommentSidebarProps {
  comments: InlineComment[];
  mode: "edit" | "review";
  activeCommentId?: string | null;
  onCommentClick?: (commentId: string) => void;
  onResolve?: (commentId: string) => void;
  className?: string;
}

export function CommentSidebar({
  comments,
  mode,
  activeCommentId,
  onCommentClick,
  onResolve,
  className,
}: CommentSidebarProps) {
  const unresolved = comments.filter((c) => !c.resolved);
  const resolved = comments.filter((c) => c.resolved);

  if (comments.length === 0) {
    return (
      <div
        className={cn(
          "flex flex-col items-center justify-center py-12 text-center",
          className
        )}
      >
        <MessageSquare className="w-8 h-8 text-slate-300 mb-2" />
        <p className="text-sm text-slate-400">
          {mode === "review"
            ? "Select text to add a comment"
            : "No comments yet"}
        </p>
      </div>
    );
  }

  function formatTime(ts: InlineComment["createdAt"]) {
    try {
      const date = ts?.toDate ? ts.toDate() : new Date(ts as unknown as number);
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return "";
    }
  }

  return (
    <div className={cn("space-y-2 overflow-y-auto", className)}>
      {unresolved.length > 0 && (
        <div className="space-y-2">
          {unresolved.map((comment) => (
            <CommentCard
              key={comment.id}
              comment={comment}
              isActive={activeCommentId === comment.id}
              mode={mode}
              formatTime={formatTime}
              onClick={() => onCommentClick?.(comment.id)}
              onResolve={() => onResolve?.(comment.id)}
            />
          ))}
        </div>
      )}

      {resolved.length > 0 && (
        <div className="mt-4">
          <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-2 px-1">
            Resolved ({resolved.length})
          </p>
          <div className="space-y-2 opacity-60">
            {resolved.map((comment) => (
              <CommentCard
                key={comment.id}
                comment={comment}
                isActive={false}
                mode={mode}
                formatTime={formatTime}
                onClick={() => onCommentClick?.(comment.id)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function CommentCard({
  comment,
  isActive,
  mode,
  formatTime,
  onClick,
  onResolve,
}: {
  comment: InlineComment;
  isActive: boolean;
  mode: "edit" | "review";
  formatTime: (ts: InlineComment["createdAt"]) => string;
  onClick?: () => void;
  onResolve?: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className={cn(
        "p-3 rounded-lg border text-sm cursor-pointer transition-colors",
        isActive
          ? "border-yellow-400 bg-yellow-50"
          : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
      )}
    >
      <div className="flex items-start justify-between gap-2 mb-1">
        <div className="flex items-center gap-1.5">
          <div className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-semibold shrink-0">
            {comment.authorName.charAt(0).toUpperCase()}
          </div>
          <span className="font-medium text-slate-700 text-xs">
            {comment.authorName}
          </span>
        </div>
        {mode === "review" && !comment.resolved && onResolve && (
          <Button
            size="sm"
            variant="ghost"
            className="h-5 px-1.5 text-xs text-slate-400 hover:text-green-600 shrink-0"
            onClick={(e) => {
              e.stopPropagation();
              onResolve();
            }}
          >
            <CheckCheck className="w-3 h-3 mr-0.5" />
            Resolve
          </Button>
        )}
      </div>
      <p className="text-slate-700 leading-relaxed">{comment.text}</p>
      <p className="text-xs text-slate-400 mt-1">{formatTime(comment.createdAt)}</p>
      {comment.resolved && (
        <p className="text-xs text-green-600 font-medium mt-1 flex items-center gap-1">
          <CheckCheck className="w-3 h-3" /> Resolved
        </p>
      )}
    </div>
  );
}
