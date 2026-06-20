// src/components/ui/rich-text-editor/hooks/use-list-enter.ts

import { useEffect } from "react";

export function useListEnter(
  editorRef: React.RefObject<HTMLDivElement | null>,
  isMarkdownMode: boolean,
) {
  useEffect(() => {
    const editor = editorRef.current;
    if (!editor || isMarkdownMode) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Enter") {
        const selection = window.getSelection();
        if (!selection || !selection.rangeCount) return;

        const range = selection.getRangeAt(0);

        // Check if inside a code block
        const preElement = (
          range.startContainer.nodeType === Node.ELEMENT_NODE
            ? (range.startContainer as HTMLElement)
            : range.startContainer.parentElement
        )?.closest("pre.code-block-editor");

        if (preElement) {
          const codeElement = preElement.querySelector("code");
          if (!codeElement) return;

          const textContent = codeElement.textContent || "";

          // Check if at the end and have 2+ empty lines
          const lines = textContent.split("\n");
          const lastTwoLines = lines.slice(-2);

          // If last two lines are empty and Enter is pressed, exit the code block
          if (
            lastTwoLines.length >= 2 &&
            lastTwoLines[0].trim() === "" &&
            lastTwoLines[1].trim() === ""
          ) {
            e.preventDefault();

            // Remove the last two empty lines
            const newText = lines.slice(0, -2).join("\n");
            codeElement.textContent = newText || "\n";

            // Create a new div after the code block
            const newDiv = document.createElement("div");
            newDiv.innerHTML = "<br>";
            preElement.parentNode?.insertBefore(newDiv, preElement.nextSibling);

            // Move cursor to the new div
            const newRange = document.createRange();
            newRange.setStart(newDiv, 0);
            newRange.collapse(true);
            selection.removeAllRanges();
            selection.addRange(newRange);

            // Trigger input
            editor.dispatchEvent(new Event("input", { bubbles: true }));
            return;
          }

          // Normal Enter: insert newline (browser default behavior is fine)
        }
      }
    };

    editor.addEventListener("keydown", handleKeyDown);
    return () => editor.removeEventListener("keydown", handleKeyDown);
  }, [editorRef, isMarkdownMode]);
}
