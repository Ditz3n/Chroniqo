// src/components/ui/rich-text-editor/hooks/use-link-typing.ts

import { useEffect } from "react";

export function useLinkTyping(
  editorRef: React.RefObject<HTMLDivElement | null>,
  isMarkdownMode: boolean,
) {
  useEffect(() => {
    const editor = editorRef.current;
    if (!editor || isMarkdownMode) return;

    const handleBeforeInput = (e: InputEvent) => {
      // Only handle text insertion
      if (e.inputType !== "insertText" || !e.data) return;

      const selection = window.getSelection();
      if (!selection || !selection.rangeCount) return;

      const range = selection.getRangeAt(0);

      // Only handle collapsed cursor (not selections)
      if (!range.collapsed) return;

      const container = range.startContainer;
      const offset = range.startOffset;

      // Check if  in a zero-width space right after a link
      if (container.nodeType === Node.TEXT_NODE) {
        const textNode = container as Text;

        // Check if this text node starts with zero-width space and cursor is at position 0 or 1
        if (offset <= 1 && textNode.textContent?.charCodeAt(0) === 0x200b) {
          // Check if previous sibling is a link
          const previousSibling = textNode.previousSibling;
          if (previousSibling && previousSibling.nodeName === "A") {
            e.preventDefault();

            const link = previousSibling as HTMLAnchorElement;

            // Append text to the link
            link.textContent = (link.textContent || "") + e.data;

            // Keep cursor in the zero-width space (so next character also extends link)
            range.setStart(textNode, 0);
            range.collapse(true);
            selection.removeAllRanges();
            selection.addRange(range);

            // Trigger input event to update markdown
            const inputEvent = new Event("input", { bubbles: true });
            editor.dispatchEvent(inputEvent);
          }
        }
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
        // User is manually navigating - clean up zero-width spaces they pass
        setTimeout(() => {
          const selection = window.getSelection();
          if (!selection || !selection.rangeCount) return;

          const range = selection.getRangeAt(0);
          const container = range.startContainer;

          // If just a zero-width space has been left, position now outside the link
          // The zero-width space has served its purpose
          if (container.nodeType === Node.TEXT_NODE) {
            const textNode = container as Text;
            const offset = range.startOffset;

            // Check if just passed a zero-width space
            if (
              offset > 0 &&
              textNode.textContent?.charCodeAt(offset - 1) === 0x200b
            ) {
              // Remove the zero-width space
              textNode.textContent =
                textNode.textContent.substring(0, offset - 1) +
                textNode.textContent.substring(offset);

              // Adjust cursor position
              range.setStart(textNode, offset - 1);
              range.collapse(true);
              selection.removeAllRanges();
              selection.addRange(range);
            }
          }
        }, 0);
      }
    };

    editor.addEventListener("beforeinput", handleBeforeInput as EventListener);
    editor.addEventListener("keydown", handleKeyDown);

    return () => {
      editor.removeEventListener(
        "beforeinput",
        handleBeforeInput as EventListener,
      );
      editor.removeEventListener("keydown", handleKeyDown);
    };
  }, [editorRef, isMarkdownMode]);
}
