// src/components/ui/rich-text-editor/hooks/use-quote-enter.ts

import { useEffect } from "react";

export function useQuoteEnter(
  editorRef: React.RefObject<HTMLDivElement | null>,
  isMarkdownMode: boolean,
) {
  useEffect(() => {
    const editor = editorRef.current;
    if (!editor || isMarkdownMode) return;

    const handleQuoteEnter = (e: KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        const selection = window.getSelection();
        if (!selection || !selection.rangeCount) return;
        const range = selection.getRangeAt(0);
        const container = range.startContainer;
        const element = (
          container.nodeType === Node.ELEMENT_NODE
            ? container
            : container.parentElement
        ) as HTMLElement;

        const parentQuote = element?.closest("blockquote");
        if (parentQuote) {
          // --- DOUBLE ENTER DETECTION (Break Out) ---
          let isLineEmpty = false;
          let nodeToRemove: Node | null = null;

          // Check text node
          if (container.nodeType === Node.TEXT_NODE) {
            const text = container.textContent || "";
            // Empty or just ZWSP
            if (!text.replace(/\u200B/g, "").trim()) {
              // If previous sibling is BR, the cursor is on a new empty line
              if (container.previousSibling?.nodeName === "BR") {
                isLineEmpty = true;
                nodeToRemove = container.previousSibling;
              }
              // Or if it's the only thing in the quote
              else if (!container.previousSibling && !container.nextSibling) {
                isLineEmpty = true;
              }
            }
          }
          // Check element
          else if (container.nodeType === Node.ELEMENT_NODE) {
            const child = container.childNodes[range.startOffset];
            const prev = container.childNodes[range.startOffset - 1];

            // Sitting on a BR
            if (child?.nodeName === "BR") {
              if (!prev || prev.nodeName === "BR") {
                isLineEmpty = true;
                nodeToRemove = child;
              }
            }
            // After a BR
            else if (prev?.nodeName === "BR") {
              const prevPrev = container.childNodes[range.startOffset - 2];
              if (
                !prevPrev ||
                prevPrev.nodeName === "BR" ||
                prevPrev.nodeName === "DIV"
              ) {
                isLineEmpty = true;
                nodeToRemove = prev;
              }
            }
          }

          if (isLineEmpty) {
            e.preventDefault(); // Stop browser from making another line

            // 1. Remove the empty line/BR
            if (nodeToRemove && nodeToRemove.parentNode) {
              nodeToRemove.parentNode.removeChild(nodeToRemove);
            }
            if (
              container.nodeType === Node.TEXT_NODE &&
              !container.textContent?.trim()
            ) {
              container.parentNode?.removeChild(container);
            }

            // 2. Create new div outside
            const newDiv = document.createElement("div");
            newDiv.innerHTML = "<br>";

            if (parentQuote.nextSibling) {
              parentQuote.parentNode?.insertBefore(
                newDiv,
                parentQuote.nextSibling,
              );
            } else {
              parentQuote.parentNode?.appendChild(newDiv);
            }

            // 3. Move cursor
            const newRange = document.createRange();
            newRange.setStart(newDiv, 0);
            newRange.collapse(true);
            selection.removeAllRanges();
            selection.addRange(newRange);

            editor.dispatchEvent(new Event("input", { bubbles: true }));
          } else {
            // === EXTEND QUOTE ===
            e.preventDefault();

            // Insert a literal <br> so the browser doesn't split the blockquote element
            const br = document.createElement("br");
            range.deleteContents();
            range.insertNode(br);

            // Add a Zero-Width Space after the BR so the cursor has a text node to sit in on the new line
            const zwsp = document.createTextNode("\u200B");
            br.parentNode?.insertBefore(zwsp, br.nextSibling);

            const newRange = document.createRange();
            newRange.setStart(zwsp, 0);
            newRange.collapse(true);
            selection.removeAllRanges();
            selection.addRange(newRange);

            editor.dispatchEvent(new Event("input", { bubbles: true }));
          }
        }
      }
    };

    editor.addEventListener("keydown", handleQuoteEnter);
    return () => editor.removeEventListener("keydown", handleQuoteEnter);
  }, [editorRef, isMarkdownMode]);
}
