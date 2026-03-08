import { Mark, mergeAttributes } from "@tiptap/core";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    comment: {
      /** Apply a comment highlight mark with the given commentId */
      setComment: (commentId: string) => ReturnType;
      /** Remove the comment mark from the current selection */
      unsetComment: () => ReturnType;
    };
  }
}

/**
 * Custom TipTap Mark that wraps selected text with a comment highlight.
 * The commentId attribute links back to the `inlineComments` Firestore collection.
 *
 * Renders as: <span data-comment-id="{uuid}" class="bg-yellow-200 ...">
 */
export const CommentMark = Mark.create({
  name: "comment",

  addAttributes() {
    return {
      commentId: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-comment-id"),
        renderHTML: (attributes) => {
          if (!attributes.commentId) return {};
          return { "data-comment-id": attributes.commentId };
        },
      },
    };
  },

  parseHTML() {
    return [{ tag: "span[data-comment-id]" }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "span",
      mergeAttributes(
        {
          class:
            "bg-yellow-200 border-b-2 border-yellow-400 cursor-pointer rounded-sm transition-colors",
        },
        HTMLAttributes
      ),
      0,
    ];
  },

  addCommands() {
    return {
      setComment:
        (commentId: string) =>
        ({ commands }) => {
          return commands.setMark(this.name, { commentId });
        },
      unsetComment:
        () =>
        ({ commands }) => {
          return commands.unsetMark(this.name);
        },
    };
  },
});
