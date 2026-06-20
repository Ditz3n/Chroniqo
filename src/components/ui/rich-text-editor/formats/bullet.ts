// src/components/ui/rich-text-editor/formats/bullet.ts

const LIST_TAG = "ul";
const LIST_CLASS = "nested-ul pl-8 my-2";

export function applyBullet(
  range: Range,
  selection: Selection,
  editor: HTMLElement | null,
): void {
  // Check for incompatible blocks to convert FROM (including headings)
  const parentBlock = (
    range.startContainer.nodeType === Node.ELEMENT_NODE
      ? (range.startContainer as HTMLElement)
      : range.startContainer.parentElement
  )?.closest("pre.code-block-editor, h1, h2, h3, blockquote");

  if (parentBlock) {
    const list = document.createElement(LIST_TAG);
    list.className = LIST_CLASS;

    const content = (parentBlock.textContent || "").replace(/\u200B/g, "");
    const lines = content.split("\n");

    lines.forEach((line) => {
      if (line.trim()) {
        const li = document.createElement("li");
        li.textContent = line;
        list.appendChild(li);
      }
    });

    if (list.children.length === 0) {
      const li = document.createElement("li");
      li.innerHTML = "<br>";
      list.appendChild(li);
    }

    parentBlock.parentNode?.replaceChild(list, parentBlock);

    const newRange = document.createRange();
    if (list.firstChild) {
      newRange.selectNodeContents(list.firstChild);
      newRange.collapse(false);
    }
    selection.removeAllRanges();
    selection.addRange(newRange);

    editor?.dispatchEvent(new Event("input", { bubbles: true }));
    return;
  }

  // Standard behavior - check if already in a list
  const existingList = (
    range.startContainer.nodeType === Node.ELEMENT_NODE
      ? (range.startContainer as HTMLElement)
      : range.startContainer.parentElement
  )?.closest("ul, ol");

  if (existingList) {
    document.execCommand("insertUnorderedList");
  } else {
    const editorEl = editor as HTMLElement;
    if (
      editorEl &&
      (!editorEl.textContent?.trim() || editorEl.textContent === "\u200B")
    ) {
      const list = document.createElement(LIST_TAG);
      list.className = LIST_CLASS;
      const li = document.createElement("li");
      li.innerHTML = "<br>";
      list.appendChild(li);

      editorEl.innerHTML = "";
      editorEl.appendChild(list);

      const newRange = document.createRange();
      newRange.selectNodeContents(li);
      newRange.collapse(true);
      selection.removeAllRanges();
      selection.addRange(newRange);
    } else {
      document.execCommand("insertUnorderedList");

      const sel = window.getSelection();
      if (sel && sel.anchorNode) {
        const listElement = sel.anchorNode.parentElement?.closest(LIST_TAG);
        if (listElement && !listElement.className) {
          listElement.className = LIST_CLASS;
        }
      }
    }
  }

  editor?.dispatchEvent(new Event("input", { bubbles: true }));
}
