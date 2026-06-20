// src/components/ui/rich-text-editor/utils.ts

export function normalizeUrl(url: string): string {
  const trimmedUrl = url.trim();
  if (!trimmedUrl) return "";
  if (/^[a-zA-Z][a-zA-Z\d+\-.]*:/.test(trimmedUrl)) {
    return trimmedUrl;
  }
  return `https://${trimmedUrl}`;
}

export function removeHeadingIfPresent(
  range: Range,
  selection: Selection,
): boolean {
  const parentHeading = (
    range.startContainer.nodeType === Node.ELEMENT_NODE
      ? (range.startContainer as HTMLElement)
      : range.startContainer.parentElement
  )?.closest("h1");

  if (parentHeading) {
    const parent = parentHeading.parentNode;
    if (parent) {
      const p = document.createElement("div");
      while (parentHeading.firstChild) {
        p.appendChild(parentHeading.firstChild);
      }
      parent.replaceChild(p, parentHeading);

      const newRange = document.createRange();
      newRange.selectNodeContents(p);
      newRange.collapse(false);
      selection.removeAllRanges();
      selection.addRange(newRange);
    }
    return true;
  }
  return false;
}

/**
 * Creates the menu button container used inside every table cell.
 * Shared between applyTable (formats/table.ts) and parseMarkdownToHTML.
 */
export function createTableCellButton(): HTMLDivElement {
  const btnContainer = document.createElement("div");
  btnContainer.className = "table-cell-menu-container";
  btnContainer.contentEditable = "false";

  const btn = document.createElement("button");
  btn.className = "table-cell-menu-button";
  btn.type = "button";
  btn.setAttribute("data-table-menu-trigger", "true");
  btn.onpointerdown = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };
  btn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="1"/><circle cx="12" cy="5" r="1"/><circle cx="12" cy="19" r="1"/></svg>`;

  btnContainer.appendChild(btn);
  return btnContainer;
}
