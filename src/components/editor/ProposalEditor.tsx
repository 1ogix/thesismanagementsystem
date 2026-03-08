"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import { BubbleMenu } from "@tiptap/react/menus";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import Placeholder from "@tiptap/extension-placeholder";
import CharacterCount from "@tiptap/extension-character-count";
import { CommentMark } from "./CommentExtension";
import { CommentSidebar } from "./CommentSidebar";
import {
  getProposalDocument,
  saveProposalDocument,
  getInlineComments,
  addInlineComment,
  resolveInlineComment,
} from "@/lib/firestore/proposalDocs";
import { InlineComment } from "@/types";
import { Button } from "@/components/ui/button";
import {
  Bold,
  Italic,
  UnderlineIcon,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  AlignLeft,
  AlignCenter,
  AlignRight,
  MessageSquarePlus,
  Check,
  X,
  Save,
} from "lucide-react";
import { cn } from "@/lib/utils";
import styles from "./editor.module.css";
import { toast } from "sonner";

interface ProposalEditorProps {
  thesisId: string;
  mode: "edit" | "review";
  userId: string;
  userName: string;
  /** Student: is the proposal currently submitted and awaiting review? */
  readOnly?: boolean;
  onSubmitForReview?: () => Promise<void>;
}

type SaveStatus = "idle" | "saving" | "saved" | "error";

export function ProposalEditor({
  thesisId,
  mode,
  userId,
  userName,
  readOnly = false,
  onSubmitForReview,
}: ProposalEditorProps) {
  const [comments, setComments] = useState<InlineComment[]>([]);
  const [activeCommentId, setActiveCommentId] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [contentLoaded, setContentLoaded] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Comment bubble state
  const [isAddingComment, setIsAddingComment] = useState(false);
  const [pendingComment, setPendingComment] = useState("");
  const pendingSelectionRef = useRef<{ from: number; to: number } | null>(null);
  const commentInputRef = useRef<HTMLInputElement>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasLoadedRef = useRef(false);

  const isEditable = mode === "edit" && !readOnly;

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit,
      Underline,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Placeholder.configure({
        placeholder: "Start writing your proposal here...",
      }),
      CharacterCount,
      CommentMark,
    ],
    content: "",
    // Always keep editable true so BubbleMenu + text selection work in review mode.
    // Key/paste input is blocked via editorProps in review mode.
    editable: true,
    editorProps: {
      // In review mode: block keyboard input so adviser can't modify text,
      // but allow mouse selection (needed for BubbleMenu to work).
      handleKeyDown: !isEditable ? () => true : undefined,
      handlePaste: !isEditable ? () => true : undefined,
      handleDrop: !isEditable ? () => true : undefined,
      attributes: {
        class: !isEditable ? "cursor-default select-text" : "",
        spellcheck: "false",
      },
      // Strip Google Docs / Word inline styles and proprietary wrappers on paste
      transformPastedHTML(html: string) {
        const div = document.createElement("div");
        div.innerHTML = html;
        // Remove all inline styles and class/id/dir attributes
        div.querySelectorAll("*").forEach((el) => {
          el.removeAttribute("style");
          el.removeAttribute("class");
          el.removeAttribute("id");
          el.removeAttribute("dir");
          el.removeAttribute("data-pm-slice");
        });
        // Google Docs wraps everything in <b id="docs-internal-guid-..."> as a container
        // (not actually bold — font-weight:normal). Unwrap it.
        div.querySelectorAll("b").forEach((b) => {
          if (b.id.startsWith("docs-internal-guid")) {
            b.replaceWith(...Array.from(b.childNodes));
          }
        });
        return div.innerHTML;
      },
    },
    onUpdate: ({ editor }) => {
      if (!hasLoadedRef.current || !isEditable) return;
      setSaveStatus("saving");
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(async () => {
        try {
          await saveProposalDocument(thesisId, editor.getJSON(), userId);
          setSaveStatus("saved");
          setTimeout(() => setSaveStatus("idle"), 2500);
        } catch {
          setSaveStatus("error");
        }
      }, 2000);
    },
  });

  // Load document content + comments on mount
  useEffect(() => {
    if (!editor) return;
    Promise.all([
      getProposalDocument(thesisId),
      getInlineComments(thesisId),
    ]).then(([doc, loadedComments]) => {
      if (doc?.content) {
        editor.commands.setContent(doc.content);
      }
      setComments(loadedComments);
      setContentLoaded(true);
      // Delay flag to prevent auto-save from firing on initial load
      setTimeout(() => {
        hasLoadedRef.current = true;
      }, 200);
    });
  }, [editor, thesisId]);

  // Scroll to active comment highlight in the document
  useEffect(() => {
    if (!activeCommentId || !editor) return;
    const el = editor.view.dom.querySelector(
      `[data-comment-id="${activeCommentId}"]`
    ) as HTMLElement | null;
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      el.classList.add("active-comment");
      setTimeout(() => el.classList.remove("active-comment"), 1500);
    }
  }, [activeCommentId, editor]);

  const handleConfirmComment = useCallback(async () => {
    if (!editor || !pendingComment.trim() || !pendingSelectionRef.current) return;
    const commentId = crypto.randomUUID();
    const { from, to } = pendingSelectionRef.current;

    // Apply the mark to the stored selection range
    editor
      .chain()
      .setTextSelection({ from, to })
      .setComment(commentId)
      .run();

    // Persist: document (with mark) + comment text
    try {
      await saveProposalDocument(thesisId, editor.getJSON(), userId);
      await addInlineComment(thesisId, userId, userName, pendingComment, commentId);
      setComments((prev) => [
        ...prev,
        {
          id: commentId,
          thesisId,
          authorId: userId,
          authorName: userName,
          text: pendingComment,
          resolved: false,
          createdAt: { toDate: () => new Date() } as InlineComment["createdAt"],
        },
      ]);
      toast.success("Comment added.");
    } catch {
      toast.error("Failed to save comment.");
    }

    setPendingComment("");
    setIsAddingComment(false);
    pendingSelectionRef.current = null;
  }, [editor, pendingComment, thesisId, userId, userName]);

  const cancelComment = useCallback(() => {
    setPendingComment("");
    setIsAddingComment(false);
    pendingSelectionRef.current = null;
  }, []);

  const handleResolveComment = useCallback(
    async (commentId: string) => {
      try {
        await resolveInlineComment(commentId);
        setComments((prev) =>
          prev.map((c) => (c.id === commentId ? { ...c, resolved: true } : c))
        );
        toast.success("Comment resolved.");
      } catch {
        toast.error("Failed to resolve comment.");
      }
    },
    []
  );

  const handleSubmitForReview = useCallback(async () => {
    if (!onSubmitForReview) return;
    setSubmitting(true);
    try {
      // Save latest content first
      if (editor) {
        await saveProposalDocument(thesisId, editor.getJSON(), userId);
      }
      await onSubmitForReview();
    } finally {
      setSubmitting(false);
    }
  }, [editor, onSubmitForReview, thesisId, userId]);

  if (!editor || !contentLoaded) {
    return (
      <div className="animate-pulse space-y-3">
        <div className="h-10 bg-slate-100 rounded-lg" />
        <div className="h-64 bg-slate-50 rounded-lg border" />
      </div>
    );
  }

  const charCount = editor.storage.characterCount?.characters() ?? 0;
  const wordCount = editor.storage.characterCount?.words() ?? 0;

  return (
    <div className="flex gap-4">
      {/* Editor column */}
      <div className="flex-1 min-w-0">
        {/* Toolbar — edit mode only */}
        {isEditable && (
          <div className="flex flex-wrap items-center gap-0.5 p-1.5 border border-b-0 rounded-t-lg bg-slate-50">
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleBold().run()}
              active={editor.isActive("bold")}
              title="Bold"
            >
              <Bold className="w-4 h-4" />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleItalic().run()}
              active={editor.isActive("italic")}
              title="Italic"
            >
              <Italic className="w-4 h-4" />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleUnderline().run()}
              active={editor.isActive("underline")}
              title="Underline"
            >
              <UnderlineIcon className="w-4 h-4" />
            </ToolbarButton>
            <div className="w-px h-5 bg-slate-300 mx-1" />
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
              active={editor.isActive("heading", { level: 1 })}
              title="Heading 1"
            >
              <Heading1 className="w-4 h-4" />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
              active={editor.isActive("heading", { level: 2 })}
              title="Heading 2"
            >
              <Heading2 className="w-4 h-4" />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
              active={editor.isActive("heading", { level: 3 })}
              title="Heading 3"
            >
              <Heading3 className="w-4 h-4" />
            </ToolbarButton>
            <div className="w-px h-5 bg-slate-300 mx-1" />
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleBulletList().run()}
              active={editor.isActive("bulletList")}
              title="Bullet list"
            >
              <List className="w-4 h-4" />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleOrderedList().run()}
              active={editor.isActive("orderedList")}
              title="Numbered list"
            >
              <ListOrdered className="w-4 h-4" />
            </ToolbarButton>
            <div className="w-px h-5 bg-slate-300 mx-1" />
            <ToolbarButton
              onClick={() => editor.chain().focus().setTextAlign("left").run()}
              active={editor.isActive({ textAlign: "left" })}
              title="Align left"
            >
              <AlignLeft className="w-4 h-4" />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().setTextAlign("center").run()}
              active={editor.isActive({ textAlign: "center" })}
              title="Align center"
            >
              <AlignCenter className="w-4 h-4" />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().setTextAlign("right").run()}
              active={editor.isActive({ textAlign: "right" })}
              title="Align right"
            >
              <AlignRight className="w-4 h-4" />
            </ToolbarButton>
          </div>
        )}

        {/* BubbleMenu — review mode: "Add Comment" */}
        {mode === "review" && (
          <BubbleMenu
            editor={editor}
            shouldShow={({ from, to }: { from: number; to: number }) => {
              if (isAddingComment) return true;
              return from !== to;
            }}
          >
            {isAddingComment ? (
              <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-lg shadow-lg px-2 py-1.5">
                <input
                  ref={commentInputRef}
                  value={pendingComment}
                  onChange={(e) => setPendingComment(e.target.value)}
                  placeholder="Add a comment…"
                  className="text-sm outline-none border-b border-slate-300 w-44 pb-0.5 bg-transparent"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && pendingComment.trim())
                      handleConfirmComment();
                    if (e.key === "Escape") cancelComment();
                  }}
                  autoFocus
                />
                <button
                  onClick={handleConfirmComment}
                  disabled={!pendingComment.trim()}
                  className="text-green-600 hover:text-green-700 disabled:text-slate-300"
                  title="Save comment"
                >
                  <Check className="w-4 h-4" />
                </button>
                <button
                  onClick={cancelComment}
                  className="text-slate-400 hover:text-red-500"
                  title="Cancel"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => {
                  const { from, to } = editor.state.selection;
                  pendingSelectionRef.current = { from, to };
                  setIsAddingComment(true);
                  setTimeout(() => commentInputRef.current?.focus(), 50);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 text-white text-sm rounded-lg shadow-lg hover:bg-slate-700 transition-colors"
              >
                <MessageSquarePlus className="w-3.5 h-3.5" />
                Add Comment
              </button>
            )}
          </BubbleMenu>
        )}

        {/* Editor area */}
        <div
          className={cn(
            styles.editor,
            "border rounded-b-lg bg-white overflow-auto",
            isEditable ? "min-h-[420px]" : "min-h-[380px] bg-slate-50/50",
            !isEditable && "border rounded-lg"
          )}
        >
          <EditorContent editor={editor} />
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between mt-2 px-1">
          <p className="text-xs text-slate-400">
            {wordCount} words · {charCount} characters
          </p>
          <div className="flex items-center gap-3">
            {isEditable && (
              <span
                className={cn("text-xs flex items-center gap-1", {
                  "text-slate-400": saveStatus === "idle",
                  "text-blue-500": saveStatus === "saving",
                  "text-green-600": saveStatus === "saved",
                  "text-red-500": saveStatus === "error",
                })}
              >
                {saveStatus === "saving" && (
                  <>
                    <Save className="w-3 h-3 animate-pulse" /> Saving…
                  </>
                )}
                {saveStatus === "saved" && (
                  <>
                    <Save className="w-3 h-3" /> Saved
                  </>
                )}
                {saveStatus === "error" && "Save failed"}
              </span>
            )}
            {isEditable && onSubmitForReview && (
              <Button
                size="sm"
                className="bg-blue-600 hover:bg-blue-500"
                onClick={handleSubmitForReview}
                disabled={submitting || charCount < 10}
              >
                {submitting ? "Submitting…" : "Submit for Review"}
              </Button>
            )}
          </div>
        </div>

        {/* Read-only banners */}
        {readOnly && mode === "edit" && (
          <p className="text-xs text-center text-blue-600 font-medium mt-2 py-2 bg-blue-50 rounded-lg border border-blue-200">
            📋 Your proposal is under review. You can edit again once the adviser responds.
          </p>
        )}
      </div>

      {/* Comment sidebar */}
      {(mode === "review" || comments.length > 0) && (
        <div className="w-72 shrink-0">
          <div className="sticky top-4">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
              Comments ({comments.filter((c) => !c.resolved).length} open)
            </p>
            <CommentSidebar
              comments={comments}
              mode={mode}
              activeCommentId={activeCommentId}
              onCommentClick={setActiveCommentId}
              onResolve={handleResolveComment}
              className="max-h-[calc(100vh-16rem)]"
            />
          </div>
        </div>
      )}
    </div>
  );
}

function ToolbarButton({
  onClick,
  active,
  title,
  children,
}: {
  onClick: () => void;
  active: boolean;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={cn(
        "p-1.5 rounded transition-colors",
        active
          ? "bg-slate-200 text-slate-900"
          : "text-slate-500 hover:bg-slate-100 hover:text-slate-900"
      )}
    >
      {children}
    </button>
  );
}
