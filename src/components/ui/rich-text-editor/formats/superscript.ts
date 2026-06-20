// src/components/ui/rich-text-editor/formats/superscript.ts

export function applySuperscript(range: Range, selection: Selection): void {
  // 1. Check if the cursor is currently inside a SUP tag
  let node: Node | null = range.startContainer;
  let supNode: HTMLElement | null = null;

  while (node && node.nodeType !== Node.DOCUMENT_NODE) {
    if (node.nodeType === Node.ELEMENT_NODE) {
      const el = node as HTMLElement;
      if (el.getAttribute("contenteditable") === "true") break;
      if (el.tagName === "SUP") {
        supNode = el;
        break;
      }
    }
    node = node.parentNode;
  }

  if (supNode) {
    // 2. We are currently inside a superscript tag. Toggle OFF.
    if (range.collapsed) {
      // Break out of the superscript tag by inserting a zero-width space after it
      const zws = document.createTextNode("\u200B");
      if (supNode.nextSibling) {
        supNode.parentNode?.insertBefore(zws, supNode.nextSibling);
      } else {
        supNode.parentNode?.appendChild(zws);
      }

      // Move cursor to the zero-width space outside the tag
      const newRange = document.createRange();
      newRange.setStart(zws, 1);
      newRange.collapse(true);
      selection.removeAllRanges();
      selection.addRange(newRange);
    } else {
      // Text is highlighted inside, let the native command unwrap it
      document.execCommand("superscript");
    }
  } else {
    // 3. We are NOT inside a superscript tag. Toggle ON.
    if (range.collapsed) {
      // Insert an empty SUP tag with a zero-width space to hold the cursor
      const sup = document.createElement("sup");
      sup.textContent = "\u200B";
      range.insertNode(sup);

      // Move cursor inside the new tag
      const newRange = document.createRange();
      newRange.setStart(sup, 1);
      newRange.collapse(true);
      selection.removeAllRanges();
      selection.addRange(newRange);
    } else {
      // Wrap the highlighted text in a SUP tag
      const sup = document.createElement("sup");
      sup.appendChild(range.extractContents());
      range.insertNode(sup);

      // Reselect the newly wrapped text
      selection.removeAllRanges();
      const newRange = document.createRange();
      newRange.selectNodeContents(sup);
      selection.addRange(newRange);
    }
  }
}
