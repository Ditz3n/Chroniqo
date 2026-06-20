// src/components/ui/rich-text-editor/hooks/use-tab-list-indent.ts
import { useEffect } from "react";

export function useTabListIndent(
  editorRef: React.RefObject<HTMLDivElement | null>,
  isMarkdownMode: boolean,
) {
  useEffect(() => {
    const editor = editorRef.current;
    if (!editor || isMarkdownMode) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Tab") {
        const selection = window.getSelection();
        if (!selection || !selection.rangeCount) return;

        const range = selection.getRangeAt(0);
        let node = range.startContainer;
        if (node.nodeType === Node.TEXT_NODE) node = node.parentElement as Node;

        const listItem = (node as HTMLElement).closest("li");

        if (listItem) {
          // Prevent default so focus does not jump to toolbar
          e.preventDefault();

          const list = listItem.parentElement as HTMLElement;
          const isOrdered = list.tagName.toLowerCase() === "ol";

          if (e.shiftKey) {
            // Shift+Tab: Outdent
            const parentLI = list.closest("li");
            if (parentLI) {
              const grandparentList = parentLI.parentElement;
              if (grandparentList) {
                grandparentList.insertBefore(listItem, parentLI.nextSibling);
                if (list.children.length === 0) list.remove();
              }
            } else {
              // Reached root, exit list format natively
              document.execCommand("outdent");
            }
          } else {
            // Tab: Indent (only if there is a previous line to nest under)
            const prevItem = listItem.previousElementSibling as HTMLLIElement;

            if (prevItem) {
              // Calculate current depth to enforce max depth of 5
              let depth = 1;
              let curr = list;
              while (
                curr &&
                curr.parentElement &&
                curr.parentElement.closest("ul, ol")
              ) {
                depth++;
                curr = curr.parentElement.closest("ul, ol") as HTMLElement;
              }

              if (depth < 5) {
                let nestedList = prevItem.querySelector(
                  `:scope > ${isOrdered ? "ol" : "ul"}`,
                ) as HTMLElement;
                if (!nestedList) {
                  nestedList = document.createElement(isOrdered ? "ol" : "ul");
                  nestedList.className = isOrdered
                    ? "nested-ol pl-8"
                    : "nested-ul pl-8";
                  prevItem.appendChild(nestedList);
                }
                nestedList.appendChild(listItem);
              }
            }
          }

          // Move cursor back into the item that was shifted
          const newRange = document.createRange();
          newRange.selectNodeContents(listItem);
          newRange.collapse(false);
          selection.removeAllRanges();
          selection.addRange(newRange);

          editor.dispatchEvent(new Event("input", { bubbles: true }));
        }
      }
    };

    editor.addEventListener("keydown", handleKeyDown);
    return () => editor.removeEventListener("keydown", handleKeyDown);
  }, [editorRef, isMarkdownMode]);
}
