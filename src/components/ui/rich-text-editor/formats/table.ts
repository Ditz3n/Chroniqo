// src/components/ui/rich-text-editor/formats/table.ts

import { createTableCellButton } from "../utils";

export function applyTable(
  range: Range,
  selection: Selection,
  editor: HTMLElement | null,
): void {
  const startElement =
    range.startContainer.nodeType === Node.ELEMENT_NODE
      ? (range.startContainer as HTMLElement)
      : range.startContainer.parentElement;

  const currentBlock = startElement?.closest("div");
  const editorEl = startElement?.closest('[contenteditable="true"]');

  // If in an empty div (just has <br> or no content), remove it
  if (currentBlock && currentBlock !== editorEl) {
    const isEmpty =
      !currentBlock.textContent?.trim() ||
      (currentBlock.childNodes.length === 1 &&
        currentBlock.firstChild?.nodeName === "BR");

    if (isEmpty) {
      const parent = currentBlock.parentNode;
      const nextSibling = currentBlock.nextSibling;
      currentBlock.remove();

      if (parent) {
        if (nextSibling) {
          range.setStartBefore(nextSibling);
        } else {
          range.selectNodeContents(parent);
          range.collapse(false);
        }
        selection.removeAllRanges();
        selection.addRange(range);
      }
    }
  }

  // Check if an existing block needs to be replaced
  const parentBlock = (
    range.startContainer.nodeType === Node.ELEMENT_NODE
      ? (range.startContainer as HTMLElement)
      : range.startContainer.parentElement
  )?.closest("pre.code-block-editor, h1, blockquote");

  const table = document.createElement("table");
  table.className = "editor-table";

  for (let i = 0; i < 3; i++) {
    const row = document.createElement("tr");
    for (let j = 0; j < 3; j++) {
      const cell = document.createElement("td");
      cell.className = "editor-table-cell";

      cell.appendChild(createTableCellButton());

      const content = document.createElement("div");
      content.className = "table-cell-content";
      content.contentEditable = "true";
      content.innerHTML = "<br>";
      cell.appendChild(content);

      cell.contentEditable = "false";
      row.appendChild(cell);
    }
    table.appendChild(row);
  }

  if (parentBlock) {
    // REPLACE existing block
    parentBlock.parentNode?.replaceChild(table, parentBlock);

    const p = document.createElement("div");
    p.innerHTML = "<br>";
    table.parentNode?.insertBefore(p, table.nextSibling);
  } else {
    // INSERT at cursor
    range.deleteContents();
    range.insertNode(table);

    const p = document.createElement("div");
    p.innerHTML = "<br>";
    table.parentNode?.insertBefore(p, table.nextSibling);
  }

  // Focus first cell
  const firstCell = table.querySelector<HTMLElement>(".table-cell-content");
  if (firstCell) {
    firstCell.focus();
    const newRange = document.createRange();
    newRange.selectNodeContents(firstCell);
    newRange.collapse(true);
    selection.removeAllRanges();
    selection.addRange(newRange);
  }

  editor?.dispatchEvent(new Event("input", { bubbles: true }));
}
