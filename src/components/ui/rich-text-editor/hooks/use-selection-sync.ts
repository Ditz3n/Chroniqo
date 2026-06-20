// src/components/ui/rich-text-editor/hooks/use-selection-sync.ts

"use client";

import { useEffect } from "react";

export function useSelectionSync(
  editorRef: React.RefObject<HTMLDivElement | null>,
  onSelectionChange?: (activeCell: HTMLTableCellElement | null) => void,
) {
  useEffect(() => {
    const handleSelectionChange = () => {
      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0) {
        onSelectionChange?.(null);
        return;
      }

      const node = selection.anchorNode;
      const element =
        node?.nodeType === Node.ELEMENT_NODE
          ? (node as HTMLElement)
          : node?.parentElement;
      const cell = element?.closest("td") as HTMLTableCellElement | null;

      onSelectionChange?.(cell || null);
    };

    document.addEventListener("selectionchange", handleSelectionChange);
    return () =>
      document.removeEventListener("selectionchange", handleSelectionChange);
  }, [editorRef, onSelectionChange]);
}
