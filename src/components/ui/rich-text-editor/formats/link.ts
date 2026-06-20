// src/components/ui/rich-text-editor/formats/link.ts

import { normalizeUrl } from "../utils";

export interface LinkData {
  text: string;
  url: string;
}

export function applyLink(
  range: Range,
  selection: Selection,
  linkData: LinkData,
): void {
  const link = document.createElement("a");
  link.href = normalizeUrl(linkData.url);
  link.textContent = linkData.text;
  link.className = "text-brand underline cursor-pointer hover:text-brand/80";
  link.setAttribute("data-link", "true");

  range.deleteContents();
  range.insertNode(link);

  const space = document.createTextNode("\u200B");
  link.parentNode?.insertBefore(space, link.nextSibling);

  range.setStartAfter(space);
  range.collapse(true);
  selection.removeAllRanges();
  selection.addRange(range);
}

export function applyUnlink(): void {
  document.execCommand("unlink");
}
