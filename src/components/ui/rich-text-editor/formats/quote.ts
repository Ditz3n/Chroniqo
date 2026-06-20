// src/components/ui/rich-text-editor/formats/quote.ts

import { removeHeadingIfPresent } from "../utils";

export function applyQuote(
  range: Range,
  selection: Selection,
  editor: HTMLElement | null,
): void {
  // 1. MUTUALLY EXCLUSIVE: Handle Code Block Conversion
  const parentPre = (
    range.startContainer.nodeType === Node.ELEMENT_NODE
      ? (range.startContainer as HTMLElement)
      : range.startContainer.parentElement
  )?.closest("pre.code-block-editor");

  if (parentPre) {
    const codeContent = parentPre.textContent || "";
    const quote = document.createElement("blockquote");
    quote.className =
      "border-l-4 border-foreground-40 pl-3 my-2 text-foreground-60";

    const lines = codeContent.replace(/\u200B/g, "").split("\n");
    lines.forEach((line, index) => {
      if (line) quote.appendChild(document.createTextNode(line));
      if (index < lines.length - 1)
        quote.appendChild(document.createElement("br"));
    });

    if (!quote.textContent?.trim()) {
      quote.innerHTML = "<br>";
    }

    parentPre.parentNode?.replaceChild(quote, parentPre);

    const newRange = document.createRange();
    newRange.selectNodeContents(quote);
    newRange.collapse(false);
    selection.removeAllRanges();
    selection.addRange(newRange);

    editor?.dispatchEvent(new Event("input", { bubbles: true }));
    return;
  }

  // 2. Mutually exclusive: Remove Heading
  removeHeadingIfPresent(range, selection);

  // 3. Standard Quote Logic - check if already inside a quote (Unwrap)
  const parentQuote = (
    range.startContainer.nodeType === Node.ELEMENT_NODE
      ? (range.startContainer as HTMLElement)
      : range.startContainer.parentElement
  )?.closest("blockquote");

  if (parentQuote) {
    // UNWRAP: Move children out and remove blockquote
    const parent = parentQuote.parentNode;
    if (parent) {
      const hasContent = (parentQuote.textContent?.trim().length ?? 0) > 0;
      const cursorOffset = range.startOffset;
      const cursorNode = range.startContainer;

      const childNodes = Array.from(parentQuote.childNodes);
      childNodes.forEach((child) => {
        parent.insertBefore(child, parentQuote);
      });

      if (!hasContent) {
        const textNode = document.createTextNode("");
        parent.insertBefore(textNode, parentQuote);

        const newRange = document.createRange();
        newRange.setStart(textNode, 0);
        newRange.collapse(true);
        selection.removeAllRanges();
        selection.addRange(newRange);
      } else {
        try {
          const newRange = document.createRange();
          newRange.setStart(cursorNode, cursorOffset);
          newRange.collapse(true);
          selection.removeAllRanges();
          selection.addRange(newRange);
        } catch {
          const newRange = document.createRange();
          newRange.selectNodeContents(parent as Node);
          newRange.collapse(false);
          selection.removeAllRanges();
          selection.addRange(newRange);
        }
      }

      parent.removeChild(parentQuote);
      parent.normalize();
    }
  } else {
    // WRAP: Apply quote formatting
    let nodeToWrap = range.startContainer;

    // CASE A: Cursor is directly in the editor div
    if (nodeToWrap === editor) {
      nodeToWrap = editor.childNodes[range.startOffset];
      if (!nodeToWrap) {
        nodeToWrap = editor.lastChild || editor;
      }
    }

    // CASE B: Traverse up to find the direct child of the editor
    while (
      nodeToWrap &&
      nodeToWrap.parentNode &&
      nodeToWrap.parentNode !== editor
    ) {
      nodeToWrap = nodeToWrap.parentNode;
    }

    if (nodeToWrap && nodeToWrap.parentNode === editor) {
      const quote = document.createElement("blockquote");
      quote.className =
        "border-l-4 border-foreground-40 pl-3 my-2 text-foreground-60";

      editor?.replaceChild(quote, nodeToWrap);
      quote.appendChild(nodeToWrap);

      const newRange = document.createRange();
      newRange.selectNodeContents(quote);
      newRange.collapse(false);
      selection.removeAllRanges();
      selection.addRange(newRange);
    } else if (editor?.childNodes.length === 0) {
      const quote = document.createElement("blockquote");
      quote.className =
        "border-l-4 border-foreground-40 pl-3 my-2 text-foreground-60";
      quote.innerHTML = "<br>";
      editor?.appendChild(quote);

      const newRange = document.createRange();
      newRange.selectNodeContents(quote);
      newRange.collapse(false);
      selection.removeAllRanges();
      selection.addRange(newRange);
    }
  }

  if (editor) {
    editor.dispatchEvent(new Event("input", { bubbles: true }));
    editor.focus();
  }
}
