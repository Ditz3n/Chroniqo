// src/components/ui/rich-text-editor/table-actions.ts
import { createTableCellButton } from "./utils";

function triggerInput(element: HTMLElement) {
  const editor = element.closest('[contenteditable="true"]');
  if (editor) {
    editor.dispatchEvent(new Event("input", { bubbles: true }));
  }
}

export const MAX_TABLE_ROWS = 20;
export const MAX_TABLE_COLS = 6;

export function insertRow(
  cell: HTMLTableCellElement,
  direction: "above" | "below",
) {
  const tr = cell.closest("tr");
  if (!tr) return;
  const table = tr.closest("table");
  if (!table) return;

  if (table.querySelectorAll("tr").length >= MAX_TABLE_ROWS) return;

  const newRow = document.createElement("tr");
  const numCols = tr.children.length;

  for (let i = 0; i < numCols; i++) {
    const newCell = document.createElement("td");
    newCell.className = "editor-table-cell";
    newCell.appendChild(createTableCellButton());
    const content = document.createElement("div");
    content.className = "table-cell-content";
    content.contentEditable = "true";
    content.innerHTML = "<br>";

    // Copy alignment from the column
    const existingCellContent = tr.children[i].querySelector(
      ".table-cell-content",
    ) as HTMLElement;
    if (existingCellContent && existingCellContent.style.textAlign) {
      content.style.textAlign = existingCellContent.style.textAlign;
    }
    newCell.appendChild(content);
    newCell.contentEditable = "false";
    newRow.appendChild(newCell);
  }

  if (direction === "above") {
    tr.parentNode?.insertBefore(newRow, tr);
  } else {
    tr.parentNode?.insertBefore(newRow, tr.nextSibling);
  }
  triggerInput(table);
}

export function deleteRow(cell: HTMLTableCellElement) {
  const tr = cell.closest("tr");
  const table = cell.closest("table");
  if (!tr || !table) return;

  // If it's the last row, delete the table instead
  if (table.querySelectorAll("tr").length <= 1) {
    deleteTable(cell);
    return;
  }

  tr.remove();
  triggerInput(table);
}

export function insertColumn(
  cell: HTMLTableCellElement,
  direction: "left" | "right",
) {
  const tr = cell.closest("tr");
  const table = cell.closest("table");
  if (!tr || !table) return;

  if (tr.children.length >= MAX_TABLE_COLS) return;

  const cells = Array.from(tr.children);
  const colIndex = cells.indexOf(cell);

  const rows = table.querySelectorAll("tr");
  rows.forEach((row) => {
    const newCell = document.createElement("td");
    newCell.className = "editor-table-cell";
    newCell.appendChild(createTableCellButton());
    const content = document.createElement("div");
    content.className = "table-cell-content";
    content.contentEditable = "true";
    content.innerHTML = "<br>";
    newCell.appendChild(content);
    newCell.contentEditable = "false";

    const targetCell = row.children[colIndex];
    if (direction === "left") {
      row.insertBefore(newCell, targetCell);
    } else {
      row.insertBefore(newCell, targetCell.nextSibling);
    }
  });
  triggerInput(table);
}

export function deleteColumn(cell: HTMLTableCellElement) {
  const tr = cell.closest("tr");
  const table = cell.closest("table");
  if (!tr || !table) return;

  const cells = Array.from(tr.children);
  const colIndex = cells.indexOf(cell);
  const rows = Array.from(table.querySelectorAll("tr"));

  // If it's the last column, delete the table
  if (rows[0].children.length <= 1) {
    deleteTable(cell);
    return;
  }

  rows.forEach((row) => {
    if (row.children[colIndex]) {
      row.children[colIndex].remove();
    }
  });
  triggerInput(table);
}

export function alignColumn(
  cell: HTMLTableCellElement,
  alignment: "left" | "center" | "right",
) {
  const tr = cell.closest("tr");
  const table = cell.closest("table");
  if (!tr || !table) return;

  const cells = Array.from(tr.children);
  const colIndex = cells.indexOf(cell);

  const rows = table.querySelectorAll("tr");
  rows.forEach((row) => {
    const targetCell = row.children[colIndex] as HTMLElement;
    if (targetCell) {
      // Apply style to both the outer TD and the inner content DIV to guarantee it persists
      targetCell.style.textAlign = alignment;

      const content = targetCell.querySelector(
        ".table-cell-content",
      ) as HTMLElement;
      if (content) {
        content.style.textAlign = alignment;
      }
    }
  });
  triggerInput(table);
}

export function deleteTable(cell: HTMLTableCellElement) {
  const table = cell.closest("table");
  if (!table) return;

  const p = document.createElement("div");
  p.innerHTML = "<br>";
  table.parentNode?.insertBefore(p, table);
  table.remove();

  // Set cursor to the new empty line
  const selection = window.getSelection();
  if (selection) {
    const range = document.createRange();
    range.setStart(p, 0);
    range.collapse(true);
    selection.removeAllRanges();
    selection.addRange(range);
  }
  triggerInput(p);
}
