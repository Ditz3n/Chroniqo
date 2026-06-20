// src/components/ui/rich-text-editor/hooks/use-link-observer.ts

import { useEffect } from "react";

export function useLinkObserver(
  editorRef: React.RefObject<HTMLDivElement | null>,
  isMarkdownMode: boolean,
) {
  useEffect(() => {
    const editor = editorRef.current;
    if (!editor || isMarkdownMode) return;

    const observer = new MutationObserver(() => {
      const links = editor.querySelectorAll("a");
      links.forEach((link) => {
        if (!link.hasAttribute("data-link")) {
          link.setAttribute("data-link", "true");
        }
      });
    });

    observer.observe(editor, {
      childList: true,
      subtree: true,
    });

    return () => observer.disconnect();
  }, [editorRef, isMarkdownMode]);
}
