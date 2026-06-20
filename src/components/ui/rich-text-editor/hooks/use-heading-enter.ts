// src/components/ui/rich-text-editor/hooks/use-heading-enter.ts

import { useEffect } from "react";

export function useHeadingEnter(
  editorRef: React.RefObject<HTMLDivElement | null>,
  isMarkdownMode: boolean,
) {
  useEffect(() => {
    const editor = editorRef.current;
    if (!editor || isMarkdownMode) return;

    const handleHeadingEnter = (e: KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        const selection = window.getSelection();
        if (!selection || !selection.rangeCount) return;
        const range = selection.getRangeAt(0);
        const element = (
          range.startContainer.nodeType === Node.ELEMENT_NODE
            ? range.startContainer
            : range.startContainer.parentElement
        ) as HTMLElement;

        const parentHeading = element?.closest("h1");
        if (parentHeading) {
          e.preventDefault();
          const newDiv = document.createElement("div");
          newDiv.innerHTML = "<br>";
          parentHeading.parentNode?.insertBefore(
            newDiv,
            parentHeading.nextSibling,
          );

          const newRange = document.createRange();
          newRange.setStart(newDiv, 0);
          newRange.collapse(true);
          selection.removeAllRanges();
          selection.addRange(newRange);

          editor.dispatchEvent(new Event("input", { bubbles: true }));
        }
      }
    };

    editor.addEventListener("keydown", handleHeadingEnter);
    return () => editor.removeEventListener("keydown", handleHeadingEnter);
  }, [editorRef, isMarkdownMode]);
}
