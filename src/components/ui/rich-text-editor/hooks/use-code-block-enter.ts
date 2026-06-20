// src/components/ui/rich-text-editor/hooks/use-code-block-enter.ts

import { useEffect } from "react";

export function useCodeBlockEnter(
  editorRef: React.RefObject<HTMLDivElement | null>,
  isMarkdownMode: boolean,
) {
  useEffect(() => {
    const editor = editorRef.current;
    if (!editor || isMarkdownMode) return;

    const handleCodeBlockEnter = (e: KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        const selection = window.getSelection();
        if (!selection || !selection.rangeCount) return;
        const range = selection.getRangeAt(0);

        const element = (
          range.startContainer.nodeType === Node.ELEMENT_NODE
            ? range.startContainer
            : range.startContainer.parentElement
        ) as HTMLElement;

        const preElement = element?.closest("pre.code-block-editor");

        if (!preElement) return;

        e.preventDefault(); // Take over Enter completely for Code Blocks

        const codeElement = preElement.querySelector("code");
        if (!codeElement) return;

        // Detect if the editor is wrapping lines in DIVs or just using BRs natively
        const hasDivs = Array.from(codeElement.children).some(
          (c: Element) => c.nodeName === "DIV",
        );

        // Find the current active line element
        let currentDiv =
          range.startContainer.nodeType === Node.ELEMENT_NODE
            ? (range.startContainer as HTMLElement)
            : range.startContainer.parentElement;

        while (
          currentDiv &&
          currentDiv.parentElement !== codeElement &&
          currentDiv !== codeElement
        ) {
          currentDiv = currentDiv.parentElement;
        }

        // Check if we are at the absolute end of the code block
        const testRange = range.cloneRange();
        testRange.selectNodeContents(codeElement);
        testRange.setStart(range.endContainer, range.endOffset);
        const isAtEnd = !testRange
          .toString()
          .replace(/\u200B/g, "")
          .trim();

        // Check if current line is empty
        let isLineEmpty = false;
        let nodeToRemove: Node | null = null;

        if (hasDivs && currentDiv && currentDiv.nodeName === "DIV") {
          const text = currentDiv.textContent?.replace(/\u200B/g, "").trim();
          if (!text) {
            isLineEmpty = true;
            nodeToRemove = currentDiv;
          }
        } else {
          // Using text nodes and BRs
          const prev = range.startContainer.previousSibling;
          if (range.startContainer.nodeType === Node.TEXT_NODE) {
            const text = range.startContainer.textContent
              ?.replace(/\u200B/g, "")
              .trim();
            if (!text) {
              if (prev && prev.nodeName === "BR") {
                isLineEmpty = true;
                nodeToRemove = prev;
              } else if (!prev) {
                isLineEmpty = true;
                nodeToRemove = range.startContainer;
              }
            }
          } else if (range.startContainer.nodeName === "BR") {
            isLineEmpty = true;
            nodeToRemove = range.startContainer;
          }
        }

        // --- BREAK OUT (Exit Code Block) ---
        // Exits block if we are on an empty line at the very end of the block
        if (isAtEnd && isLineEmpty) {
          if (nodeToRemove) {
            nodeToRemove.parentNode?.removeChild(nodeToRemove);
          }

          const newDiv = document.createElement("div");
          newDiv.innerHTML = "<br>";

          if (preElement.nextSibling) {
            preElement.parentNode?.insertBefore(newDiv, preElement.nextSibling);
          } else {
            preElement.parentNode?.appendChild(newDiv);
          }

          const newRange = document.createRange();
          newRange.setStart(newDiv, 0);
          newRange.collapse(true);
          selection.removeAllRanges();
          selection.addRange(newRange);

          editor.dispatchEvent(new Event("input", { bubbles: true }));
          return;
        }

        // --- EXTEND CODE BLOCK ---
        if (hasDivs && currentDiv && currentDiv.nodeName === "DIV") {
          const newDiv = document.createElement("div");
          newDiv.innerHTML = "<br>";
          codeElement.insertBefore(newDiv, currentDiv.nextSibling);

          const newRange = document.createRange();
          newRange.setStart(newDiv, 0);
          newRange.collapse(true);
          selection.removeAllRanges();
          selection.addRange(newRange);
        } else {
          const br = document.createElement("br");
          range.deleteContents();
          range.insertNode(br);

          const zwsp = document.createTextNode("\u200B");
          br.parentNode?.insertBefore(zwsp, br.nextSibling);

          const newRange = document.createRange();
          newRange.setStart(zwsp, 0);
          newRange.collapse(true);
          selection.removeAllRanges();
          selection.addRange(newRange);
        }

        editor.dispatchEvent(new Event("input", { bubbles: true }));
      }
    };

    editor.addEventListener("keydown", handleCodeBlockEnter);
    return () => editor.removeEventListener("keydown", handleCodeBlockEnter);
  }, [editorRef, isMarkdownMode]);
}
