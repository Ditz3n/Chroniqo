// src/components/ui/rich-text-editor/apply-format.ts

import { applyBold } from "./formats/bold";
import { applyBullet } from "./formats/bullet";
import { applyCode } from "./formats/code";
import { applyCodeBlock } from "./formats/code-block";
import { applyHeading } from "./formats/heading";
import { applyItalic } from "./formats/italic";
import { applyLink, applyUnlink, type LinkData } from "./formats/link";
import { applyNumbered } from "./formats/numbered";
import { applyQuote } from "./formats/quote";
import { applySpoiler } from "./formats/spoiler";
import { applyStrikethrough } from "./formats/strikethrough";
import { applySuperscript } from "./formats/superscript";
import { applyTable } from "./formats/table";

export function applyFormat(format: string, linkData?: LinkData): void {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return;

  const range = selection.getRangeAt(0);

  // Resolve the editor element from the current selection
  let editor = range.startContainer.parentElement?.closest(
    '[contenteditable="true"]',
  ) as HTMLElement | null;

  // Fallback: if the selection is directly on the editor div
  if (!editor && range.startContainer.nodeType === Node.ELEMENT_NODE) {
    const el = range.startContainer as HTMLElement;
    if (el.getAttribute("contenteditable") === "true") {
      editor = el;
    }
  }

  try {
    switch (format) {
      case "bold":
        applyBold();
        break;
      case "italic":
        applyItalic();
        break;
      case "strikethrough":
        applyStrikethrough();
        break;
      case "superscript":
        applySuperscript(range, selection); // Pass range and selection
        break;
      case "code":
        applyCode(range, selection);
        break;
      case "codeblock":
        applyCodeBlock(range, selection, editor);
        break;
      case "heading":
        applyHeading(range, selection, editor);
        break;
      case "quote":
        applyQuote(range, selection, editor);
        break;
      case "link":
        if (linkData) applyLink(range, selection, linkData);
        break;
      case "unlink":
        applyUnlink();
        break;
      case "bullet":
        applyBullet(range, selection, editor);
        break;
      case "numbered":
        applyNumbered(range, selection, editor);
        break;
      case "spoiler":
        applySpoiler(range, selection);
        break;
      case "table":
        applyTable(range, selection, editor);
        break;
    }

    // Final sync dispatch using the captured editor reference
    if (editor) {
      editor.dispatchEvent(new Event("input", { bubbles: true }));
    }
  } catch (error) {
    console.error("Error applying format:", error);
  }
}
