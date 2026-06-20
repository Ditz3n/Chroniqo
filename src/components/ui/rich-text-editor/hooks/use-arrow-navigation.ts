// src/components/ui/rich-text-editor/hooks/use-arrow-navigation.ts

import { useEffect } from "react";

export function useArrowNavigation(
  editorRef: React.RefObject<HTMLDivElement | null>,
  isMarkdownMode: boolean,
) {
  useEffect(() => {
    const editor = editorRef.current;
    if (!editor || isMarkdownMode) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Table Up/Down Navigation
      if (e.key === "ArrowUp" || e.key === "ArrowDown") {
        const selection = window.getSelection();
        if (!selection || !selection.rangeCount) return;
        const range = selection.getRangeAt(0);

        const cellContent = (
          range.startContainer.nodeType === Node.ELEMENT_NODE
            ? (range.startContainer as HTMLElement)
            : range.startContainer.parentElement
        )?.closest(".table-cell-content");

        if (cellContent) {
          const cell = cellContent.closest("td");
          const row = cell?.closest("tr");
          const table = row?.closest("table");

          if (cell && row && table) {
            e.preventDefault(); // Intercept vertical navigation in tables
            const cells = Array.from(row.children);
            const colIndex = cells.indexOf(cell);
            const rows = Array.from(table.querySelectorAll("tr"));
            const rowIndex = rows.indexOf(row);

            const targetRowIndex =
              e.key === "ArrowUp" ? rowIndex - 1 : rowIndex + 1;

            if (targetRowIndex >= 0 && targetRowIndex < rows.length) {
              const targetCell = rows[targetRowIndex].children[colIndex];
              const targetContent = targetCell?.querySelector(
                ".table-cell-content",
              ) as HTMLElement;

              if (targetContent) {
                targetContent.focus();
                const newRange = document.createRange();
                newRange.selectNodeContents(targetContent);
                // ArrowDown goes to start of cell below, ArrowUp goes to end of cell above
                newRange.collapse(e.key === "ArrowDown");
                selection.removeAllRanges();
                selection.addRange(newRange);
              }
            }
          }
        }
      }

      // Handle Arrow Right to exit formats
      if (e.key === "ArrowRight") {
        const selection = window.getSelection();
        if (!selection || !selection.rangeCount) return;

        const range = selection.getRangeAt(0);
        if (!range.collapsed) return;

        const container = range.startContainer;
        const offset = range.startOffset;

        // Special case: At position 0 in a text node immediately after inline formatting.
        // Allow moving forward into the text.
        if (container.nodeType === Node.TEXT_NODE && offset === 0) {
          const textNode = container as Text;
          const prevSibling = textNode.previousSibling;

          if (prevSibling && prevSibling.nodeType === Node.ELEMENT_NODE) {
            const prevElement = prevSibling as HTMLElement;

            // If text node has actual content (not just whitespace/ZWSP), allow normal movement
            const hasContent =
              textNode.textContent &&
              textNode.textContent.replace(/[\u200B\u00A0]/g, "").trim()
                .length > 0;

            if (hasContent) {
              return;
            }

            // Special handling required when only whitespace/ZWSP follows inline formatting
            if (
              prevElement.tagName === "STRONG" ||
              prevElement.tagName === "EM" ||
              prevElement.tagName === "S" ||
              prevElement.tagName === "SUP" ||
              prevElement.tagName === "CODE" ||
              prevElement.tagName === "A" ||
              prevElement.classList.contains("spoiler-wrapper")
            ) {
              e.preventDefault();
              e.stopPropagation();

              // Convert ZWSP/empty to NBSP (\u00A0) to force a tangible exit point
              if (
                textNode.textContent === "\u200B" ||
                textNode.textContent === ""
              ) {
                textNode.textContent = "\u00A0";
                // Dispatch input event to sync state
                const inputEvent = new Event("input", { bubbles: true });
                editor.dispatchEvent(inputEvent);
              }

              // Move to position 1 (after the space)
              setTimeout(() => {
                range.setStart(textNode, 1);
                range.collapse(true);
                selection.removeAllRanges();
                selection.addRange(range);
              }, 0);
              return;
            }
          }
        }

        // Determine if the cursor is inside inline formatting
        let node: Node | null = range.startContainer;
        let inlineFormatElement: HTMLElement | null = null;

        while (node && node !== editor) {
          if (node.nodeType === Node.ELEMENT_NODE) {
            const element = node as HTMLElement;

            if (
              element.tagName === "STRONG" ||
              element.tagName === "EM" ||
              element.tagName === "S" ||
              element.tagName === "SUP" ||
              element.tagName === "CODE" ||
              element.tagName === "A" ||
              element.classList.contains("spoiler-wrapper")
            ) {
              inlineFormatElement = element;
              break;
            }
          }
          node = node.parentNode;
        }

        if (!inlineFormatElement) {
          return;
        }

        // For spoiler, check spoiler-content
        let contentElement = inlineFormatElement;
        if (inlineFormatElement.classList.contains("spoiler-wrapper")) {
          const spoilerContent =
            inlineFormatElement.querySelector(".spoiler-content");
          if (spoilerContent) {
            contentElement = spoilerContent as HTMLElement;
          }
        }

        // Check if cursor is at the end of the content
        const textContent = contentElement.textContent || "";
        const cleanText = textContent.replace(/\u200B/g, "");

        // Calculate cursor position within the content element
        let cursorPosition = 0;
        let found = false;

        const calculatePosition = (node: Node): boolean => {
          if (node === range.startContainer) {
            cursorPosition += range.startOffset;
            found = true;
            return true;
          }

          if (node.nodeType === Node.TEXT_NODE) {
            if (!found) {
              cursorPosition += (node.textContent || "").length;
            }
          } else {
            for (let i = 0; i < node.childNodes.length; i++) {
              if (calculatePosition(node.childNodes[i])) {
                return true;
              }
            }
          }
          return false;
        };

        calculatePosition(contentElement);

        // Clean cursor position (account for ZWSPs)
        const textBeforeCursor = textContent.substring(0, cursorPosition);
        const cleanTextBeforeCursor = textBeforeCursor.replace(/\u200B/g, "");
        const cleanCursorPosition = cleanTextBeforeCursor.length;

        // Check if at the end
        if (cleanCursorPosition >= cleanText.length) {
          e.preventDefault();
          e.stopPropagation();

          // Check if there's already a text node after the inline format
          let nextNode = inlineFormatElement.nextSibling;

          // If next node is ZWSP or empty, replace it with a proper NBSP (\u00A0)
          if (nextNode && nextNode.nodeType === Node.TEXT_NODE) {
            const textNode = nextNode as Text;
            if (
              textNode.textContent === "\u200B" ||
              textNode.textContent === ""
            ) {
              textNode.textContent = "\u00A0";
            }
          } else {
            // Create NBSP after the inline format
            const spaceNode = document.createTextNode("\u00A0");
            inlineFormatElement.parentNode?.insertBefore(
              spaceNode,
              inlineFormatElement.nextSibling,
            );
            nextNode = spaceNode;
          }

          // Dispatch input event to sync state
          const inputEvent = new Event("input", { bubbles: true });
          editor.dispatchEvent(inputEvent);

          // Move cursor AFTER the space (position 1)
          if (nextNode && nextNode.nodeType === Node.TEXT_NODE) {
            const textNode = nextNode as Text;

            // Use setTimeout to ensure cursor placement happens after all other handlers
            setTimeout(() => {
              range.setStart(textNode, 1);
              range.collapse(true);
              selection.removeAllRanges();
              selection.addRange(range);

              // Force a visual update
              const editor = inlineFormatElement?.closest(
                '[contenteditable="true"]',
              ) as HTMLElement;
              if (editor) {
                editor.focus();
              }
            }, 0);
          }
        }
      }

      // Handle Arrow Left to enter formats from the right
      if (e.key === "ArrowLeft") {
        const selection = window.getSelection();
        if (!selection || !selection.rangeCount) return;

        const range = selection.getRangeAt(0);
        if (!range.collapsed) return;

        const container = range.startContainer;
        const offset = range.startOffset;

        // Check if in a text node at position 0 or 1 (start of text)
        if (container.nodeType === Node.TEXT_NODE) {
          const textNode = container as Text;

          // If at the start of a text node (or just after a ZWSP)
          if (
            offset <= 1 ||
            (offset === 1 && textNode.textContent?.charCodeAt(0) === 0x200b)
          ) {
            const previousSibling = textNode.previousSibling;

            // Check if previous sibling is an inline format
            if (
              previousSibling &&
              previousSibling.nodeType === Node.ELEMENT_NODE
            ) {
              const prevElement = previousSibling as HTMLElement;

              if (
                prevElement.tagName === "STRONG" ||
                prevElement.tagName === "EM" ||
                prevElement.tagName === "S" ||
                prevElement.tagName === "SUP" ||
                prevElement.tagName === "CODE" ||
                prevElement.tagName === "A" ||
                prevElement.classList.contains("spoiler-wrapper")
              ) {
                e.preventDefault();

                // For spoiler, go into spoiler-content
                let targetElement = prevElement;
                if (prevElement.classList.contains("spoiler-wrapper")) {
                  const spoilerContent =
                    prevElement.querySelector(".spoiler-content");
                  if (spoilerContent) {
                    targetElement = spoilerContent as HTMLElement;
                  }
                }

                // Find the last text node in the target
                const findLastTextNode = (node: Node): Text | null => {
                  if (node.nodeType === Node.TEXT_NODE) {
                    return node as Text;
                  }
                  for (let i = node.childNodes.length - 1; i >= 0; i--) {
                    const result = findLastTextNode(node.childNodes[i]);
                    if (result) return result;
                  }
                  return null;
                };

                const lastTextNode = findLastTextNode(targetElement);
                if (lastTextNode) {
                  const textLength = lastTextNode.textContent?.length || 0;
                  range.setStart(lastTextNode, textLength);
                  range.collapse(true);
                  selection.removeAllRanges();
                  selection.addRange(range);
                } else {
                  // No text node, place at end of element
                  range.setStart(
                    targetElement,
                    targetElement.childNodes.length,
                  );
                  range.collapse(true);
                  selection.removeAllRanges();
                  selection.addRange(range);
                }
              }
            }
          }
        }
      }
    };

    editor.addEventListener("keydown", handleKeyDown, true);

    return () => {
      editor.removeEventListener("keydown", handleKeyDown, true);
    };
  }, [editorRef, isMarkdownMode]);
}
