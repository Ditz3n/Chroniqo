// src/components/ui/rich-text-editor/hooks/use-inline-format-enter.ts

"use client";

import { useEffect } from "react";

export function useInlineFormatEnter(
  editorRef: React.RefObject<HTMLDivElement | null>,
  isMarkdownMode: boolean,
) {
  useEffect(() => {
    // Removed conflicting logic.
    // All code block enter/exit handling is now cleanly managed by use-code-block-enter.ts.
    // This hook is intentionally left empty to prevent duplication of logic
    // while keeping imports and existing component architecture stable.
  }, [editorRef, isMarkdownMode]);
}
