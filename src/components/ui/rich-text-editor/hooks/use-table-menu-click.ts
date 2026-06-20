// src/components/ui/rich-text-editor/hooks/use-table-menu-click.ts

import { useEffect } from "react";

export function useTableMenuClick(
  editorRef: React.RefObject<HTMLDivElement | null>,
  isMarkdownMode: boolean,
  onTableCellClick?: (cell: HTMLTableCellElement, button: HTMLElement) => void,
) {
  useEffect(() => {
    const editor = editorRef.current;
    if (!editor || isMarkdownMode) return;

    const handleTableMenuClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const button = target.closest("[data-table-menu-trigger]") as HTMLElement;

      if (button) {
        e.preventDefault();
        e.stopPropagation();

        const cell = button.closest(
          ".editor-table-cell",
        ) as HTMLTableCellElement;
        if (cell) {
          // Keep the cell content focused
          const content = cell.querySelector(
            ".table-cell-content",
          ) as HTMLElement;
          if (content) content.focus();

          // Notify parent about the click - pass BOTH cell and button
          onTableCellClick?.(cell, button);
        }
      } else {
        // UX: Check if user clicked the empty padding/space of a table cell
        const td = target.closest(".editor-table-cell");
        if (
          td &&
          (target === td ||
            target.classList.contains("table-cell-menu-container"))
        ) {
          e.preventDefault();
          const content = td.querySelector(
            ".table-cell-content",
          ) as HTMLElement;
          if (content) {
            content.focus();

            // Move cursor directly to the end of the text inside the cell
            const selection = window.getSelection();
            if (selection) {
              const range = document.createRange();
              range.selectNodeContents(content);
              range.collapse(false);
              selection.removeAllRanges();
              selection.addRange(range);
            }
          }
        }
      }
    };

    editor.addEventListener("mousedown", handleTableMenuClick, true);
    return () =>
      editor.removeEventListener("mousedown", handleTableMenuClick, true);
  }, [editorRef, isMarkdownMode, onTableCellClick]);
}
