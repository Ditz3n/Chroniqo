// src/components/ui/rich-text-editor/hooks/use-table-cell-input.ts

import { useEffect } from "react";

export function useTableCellInput(
  editorRef: React.RefObject<HTMLDivElement | null>,
  isMarkdownMode: boolean,
) {
  useEffect(() => {
    const editor = editorRef.current;
    if (!editor || isMarkdownMode) return;

    const handleTableCellInput = (e: Event) => {
      const target = e.target as HTMLElement;

      // Check if input is from a table cell content div
      if (target.classList.contains("table-cell-content")) {
        e.stopPropagation();

        // Trigger editor update on the main editor container to bypass the nested contenteditable trap
        setTimeout(() => {
          if (editor) {
            const inputEvent = new Event("input", { bubbles: true });
            editor.dispatchEvent(inputEvent);
          }
        }, 0);
      }
    };

    editor.addEventListener("input", handleTableCellInput, true);
    return () =>
      editor.removeEventListener("input", handleTableCellInput, true);
  }, [editorRef, isMarkdownMode]);
}
