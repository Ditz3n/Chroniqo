// src/components/ui/rich-text-editor/formats/code-block.ts

export function applyCodeBlock(
  range: Range,
  selection: Selection,
  editor: HTMLElement | null,
): void {
  // 1. MUTUALLY EXCLUSIVE: Handle Quote Conversion
  const parentQuote = (
    range.startContainer.nodeType === Node.ELEMENT_NODE
      ? (range.startContainer as HTMLElement)
      : range.startContainer.parentElement
  )?.closest("blockquote");

  if (parentQuote) {
    const pre = document.createElement("pre");
    pre.className = "code-block-editor";
    const code = document.createElement("code");

    const clone = parentQuote.cloneNode(true) as HTMLElement;
    const brs = clone.querySelectorAll("br");
    brs.forEach((br) => br.replaceWith("\n"));
    const cleanContent = clone.textContent?.replace(/\u200B/g, "") || "";

    code.textContent = "\u200B" + cleanContent;
    pre.appendChild(code);

    parentQuote.parentNode?.replaceChild(pre, parentQuote);

    const newRange = document.createRange();
    newRange.selectNodeContents(code);
    newRange.collapse(false);
    selection.removeAllRanges();
    selection.addRange(newRange);

    editor?.dispatchEvent(new Event("input", { bubbles: true }));
    return;
  }

  // 2. MUTUALLY EXCLUSIVE: Handle Heading Conversion
  const parentHeading = (
    range.startContainer.nodeType === Node.ELEMENT_NODE
      ? (range.startContainer as HTMLElement)
      : range.startContainer.parentElement
  )?.closest("h1");

  if (parentHeading) {
    const headingContent = parentHeading.textContent || "";
    const pre = document.createElement("pre");
    pre.className = "code-block-editor";
    const code = document.createElement("code");

    const cleanContent = headingContent.replace(/\u200B/g, "");
    code.textContent = "\u200B" + cleanContent;
    pre.appendChild(code);

    parentHeading.parentNode?.replaceChild(pre, parentHeading);

    const newRange = document.createRange();
    newRange.selectNodeContents(code);
    newRange.collapse(false);
    selection.removeAllRanges();
    selection.addRange(newRange);

    editor?.dispatchEvent(new Event("input", { bubbles: true }));
    return;
  }

  // 3. Toggle existing code block OR create new one
  const existingPre = (
    range.startContainer.nodeType === Node.ELEMENT_NODE
      ? (range.startContainer as HTMLElement)
      : range.startContainer.parentElement
  )?.closest("pre.code-block-editor");

  if (existingPre) {
    // Remove the code block - convert to plain text in a div
    const codeElement = existingPre.querySelector("code");
    const textContent = codeElement?.textContent?.replace(/\u200B/g, "") || "";

    const div = document.createElement("div");
    if (textContent.trim()) {
      div.textContent = textContent;
    } else {
      div.innerHTML = "<br>";
    }

    existingPre.parentNode?.replaceChild(div, existingPre);

    const newRange = document.createRange();
    newRange.selectNodeContents(div);
    newRange.collapse(false);
    selection.removeAllRanges();
    selection.addRange(newRange);

    editor?.dispatchEvent(new Event("input", { bubbles: true }));
    return;
  }

  // Check if it is needed to convert existing content to code block
  const currentBlock = (
    range.startContainer.nodeType === Node.ELEMENT_NODE
      ? (range.startContainer as HTMLElement)
      : range.startContainer.parentElement
  )?.closest("div");

  // Create new code block
  const pre = document.createElement("pre");
  pre.className = "code-block-editor";
  const code = document.createElement("code");

  if (
    currentBlock &&
    currentBlock.textContent?.trim() &&
    currentBlock.getAttribute("contenteditable") !== "true"
  ) {
    // Convert existing div content to code block
    const content = currentBlock.textContent.replace(/\u200B/g, "");
    code.textContent = "\u200B" + content;
    pre.appendChild(code);
    currentBlock.parentNode?.replaceChild(pre, currentBlock);
  } else {
    // Empty code block
    code.textContent = "\u200B";
    pre.appendChild(code);

    if (range.collapsed) {
      range.insertNode(pre);
    } else {
      const contents = range.extractContents();
      const textContent = contents.textContent || "";
      code.textContent = "\u200B" + textContent;
      range.insertNode(pre);
    }
  }

  // Set cursor in code element
  const newRange = document.createRange();
  newRange.setStart(code.firstChild!, 1);
  newRange.collapse(true);
  selection.removeAllRanges();
  selection.addRange(newRange);

  editor?.dispatchEvent(new Event("input", { bubbles: true }));
}
