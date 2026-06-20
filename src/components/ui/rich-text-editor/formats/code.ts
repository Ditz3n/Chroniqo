// src/components/ui/rich-text-editor/formats/code.ts

export function applyCode(range: Range, selection: Selection): void {
  const parentCode = (
    range.startContainer.nodeType === Node.ELEMENT_NODE
      ? (range.startContainer as HTMLElement)
      : range.startContainer.parentElement
  )?.closest("code");

  if (parentCode && parentCode.parentElement?.tagName.toLowerCase() !== "pre") {
    // Remove inline code formatting
    const text = parentCode.textContent || "";
    const textNode = document.createTextNode(text);
    parentCode.parentNode?.replaceChild(textNode, parentCode);

    range.setStart(textNode, text.length);
    range.collapse(true);
    selection.removeAllRanges();
    selection.addRange(range);
  } else if (!range.collapsed) {
    // Apply code formatting to selection
    const selectedText = range.toString();
    const code = document.createElement("code");
    code.className = "inline-code";
    code.textContent = selectedText;

    range.deleteContents();
    range.insertNode(code);

    range.setStartAfter(code);
    range.collapse(true);
    selection.removeAllRanges();
    selection.addRange(range);
  } else {
    // Empty selection: insert ZWSP inside code to allow typing
    const code = document.createElement("code");
    code.className = "inline-code";
    code.textContent = "\u200B";
    range.insertNode(code);
    range.setStart(code.firstChild!, 1);
    range.collapse(true);
    selection.removeAllRanges();
    selection.addRange(range);
  }
}
