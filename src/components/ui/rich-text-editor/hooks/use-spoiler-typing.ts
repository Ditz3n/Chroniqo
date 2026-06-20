// src/components/ui/rich-text-editor/hooks/use-spoiler-typing.ts

import { useEffect } from "react";

export function useSpoilerTyping(
  editorRef: React.RefObject<HTMLDivElement | null>,
  isMarkdownMode: boolean,
) {
  useEffect(() => {
    const editor = editorRef.current;
    if (!editor || isMarkdownMode) return;

    const handleBeforeInputSpoiler = (e: InputEvent) => {
      if (e.inputType !== "insertText" || !e.data) return;

      const selection = window.getSelection();
      if (!selection || !selection.rangeCount) return;

      const range = selection.getRangeAt(0);
      if (!range.collapsed) return;

      const container = range.startContainer;
      const offset = range.startOffset;

      // Check if in a zero-width space right after a spoiler
      if (container.nodeType === Node.TEXT_NODE) {
        const textNode = container as Text;

        if (offset <= 1 && textNode.textContent?.charCodeAt(0) === 0x200b) {
          const previousSibling = textNode.previousSibling;
          if (
            previousSibling &&
            previousSibling.nodeType === Node.ELEMENT_NODE &&
            (previousSibling as HTMLElement).classList.contains(
              "spoiler-wrapper",
            )
          ) {
            e.preventDefault();

            const spoiler = previousSibling as HTMLElement;
            const content = spoiler.querySelector(".spoiler-content");
            if (content) {
              // Append text to the spoiler content
              content.textContent =
                (content.textContent || "").replace(/\u200B/g, "") + e.data;

              // Keep cursor in the zero-width space
              range.setStart(textNode, 0);
              range.collapse(true);
              selection.removeAllRanges();
              selection.addRange(range);

              // Trigger input event
              const inputEvent = new Event("input", { bubbles: true });
              editor.dispatchEvent(inputEvent);
            }
          }
        }
      }
    };

    editor.addEventListener(
      "beforeinput",
      handleBeforeInputSpoiler as EventListener,
    );

    return () => {
      editor.removeEventListener(
        "beforeinput",
        handleBeforeInputSpoiler as EventListener,
      );
    };
  }, [editorRef, isMarkdownMode]);
}
