// src/components/ui/rich-text-editor/hooks/use-table-enter.ts

import { useEffect } from "react";

export function useTableEnter(
  editorRef: React.RefObject<HTMLDivElement | null>,
  isMarkdownMode: boolean,
) {
  useEffect(() => {
    const editor = editorRef.current;
    if (!editor || isMarkdownMode) return;

    const handleTableEnter = (e: KeyboardEvent) => {
      if (e.key === "Enter") {
        const selection = window.getSelection();
        if (!selection || !selection.rangeCount) return;
        const range = selection.getRangeAt(0);
        const element = (
          range.startContainer.nodeType === Node.ELEMENT_NODE
            ? range.startContainer
            : range.startContainer.parentElement
        ) as HTMLElement;

        const cellContent = element?.closest(".table-cell-content");
        if (cellContent) {
          e.preventDefault(); // Stop newlines inside cells

          const cell = cellContent.closest("td");
          const row = cell?.closest("tr");
          const table = row?.closest("table");

          if (cell && row && table) {
            const cells = Array.from(row.children);
            const colIndex = cells.indexOf(cell);
            const rows = Array.from(table.querySelectorAll("tr"));
            const rowIndex = rows.indexOf(row);

            // Shift+Enter goes up, Enter goes down
            const targetRowIndex = e.shiftKey ? rowIndex - 1 : rowIndex + 1;

            if (targetRowIndex >= 0 && targetRowIndex < rows.length) {
              const targetCell = rows[targetRowIndex].children[colIndex];
              const targetContent = targetCell?.querySelector(
                ".table-cell-content",
              ) as HTMLElement;

              if (targetContent) {
                targetContent.focus();
                const newRange = document.createRange();
                newRange.selectNodeContents(targetContent);
                newRange.collapse(false); // Put cursor at end of cell
                selection.removeAllRanges();
                selection.addRange(newRange);
              }
            }
          }
        }
      }
    };
    editor.addEventListener("keydown", handleTableEnter);
    return () => editor.removeEventListener("keydown", handleTableEnter);
  }, [editorRef, isMarkdownMode]);
}
