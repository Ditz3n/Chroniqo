// src/components/ui/rich-text-editor/hooks/use-link-click.ts

import { useEffect } from "react";

export function useLinkClick(
  editorRef: React.RefObject<HTMLDivElement | null>,
  onLinkClick?: (link: HTMLAnchorElement) => void,
  onTableCellClick?: (cell: HTMLTableCellElement, button: HTMLElement) => void,
) {
  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;

    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;

      // Handle link clicks
      if (target.tagName === "A" && target.hasAttribute("data-link")) {
        e.preventDefault();
        onLinkClick?.(target as HTMLAnchorElement);
        return;
      }

      // Handle table menu button clicks
      const menuButton = target.closest(
        "[data-table-menu-trigger]",
      ) as HTMLElement;
      if (menuButton) {
        e.preventDefault();
        e.stopPropagation();

        const cell = menuButton.closest("td") as HTMLTableCellElement;
        if (cell) {
          onTableCellClick?.(cell, menuButton);
        }
        return;
      }

      // Handle table content area clicks
      const cellContent = target.closest(".table-cell-content");
      if (cellContent) {
        (cellContent as HTMLElement).focus();
      }
    };

    editor.addEventListener("click", handleClick);
    return () => editor.removeEventListener("click", handleClick);
  }, [editorRef, onLinkClick, onTableCellClick]);
}
