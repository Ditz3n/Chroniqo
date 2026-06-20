// src/components/ui/rich-text-editor/formats/heading.ts

export function applyHeading(
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
    const h1 = document.createElement("h1");

    const cleanContent = codeContent.replace(/\u200B/g, "");
    const lines = cleanContent.split("\n");

    lines.forEach((line, index) => {
      if (line) h1.appendChild(document.createTextNode(line));
      if (index < lines.length - 1)
        h1.appendChild(document.createElement("br"));
    });

    if (!h1.textContent?.trim()) {
      h1.innerHTML = "<br>";
    }

    parentPre.parentNode?.replaceChild(h1, parentPre);

    const newRange = document.createRange();
    newRange.selectNodeContents(h1);
    newRange.collapse(false);
    selection.removeAllRanges();
    selection.addRange(newRange);

    editor?.dispatchEvent(new Event("input", { bubbles: true }));
    return;
  }

  const editorEl = (
    range.startContainer.nodeType === Node.ELEMENT_NODE
      ? (range.startContainer as HTMLElement)
      : range.startContainer.parentElement
  )?.closest('[contenteditable="true"]');

  if (!editorEl) return;

  // Helper to extract content from List Items if present
  const extractContent = (
    source: HTMLElement,
    target: HTMLElement,
  ): boolean => {
    if (source.tagName === "UL" || source.tagName === "OL") {
      const lis = source.querySelectorAll("li");
      lis.forEach((li, i) => {
        while (li.firstChild) target.appendChild(li.firstChild);
        if (i < lis.length - 1)
          target.appendChild(document.createElement("br"));
      });
      return true;
    }
    const nestedLis = source.querySelectorAll("li");
    if (nestedLis.length > 0) {
      nestedLis.forEach((li, i) => {
        while (li.firstChild) target.appendChild(li.firstChild);
        if (i < nestedLis.length - 1)
          target.appendChild(document.createElement("br"));
      });
      return true;
    }
    return false;
  };

  // Check if selection spans multiple blocks
  let startBlock: Node | null = range.startContainer;
  while (startBlock && startBlock.parentNode !== editorEl) {
    startBlock = startBlock.parentNode;
  }

  let endBlock: Node | null = range.endContainer;
  while (endBlock && endBlock.parentNode !== editorEl) {
    endBlock = endBlock.parentNode;
  }

  const spansMultipleBlocks = !range.collapsed && startBlock !== endBlock;

  if (spansMultipleBlocks) {
    const blocks: Node[] = [];
    const currentBlock: Node | null = startBlock;

    if (currentBlock) {
      blocks.push(currentBlock);
      let nextBlock = currentBlock.nextSibling;

      while (
        nextBlock &&
        nextBlock !== endBlock &&
        blocks.indexOf(nextBlock) === -1
      ) {
        blocks.push(nextBlock);
        nextBlock = nextBlock.nextSibling;
      }

      if (endBlock && blocks.indexOf(endBlock) === -1) {
        blocks.push(endBlock);
      }
    }

    const allHeadings = blocks.every(
      (block) =>
        block.nodeType === Node.ELEMENT_NODE &&
        (block as HTMLElement).tagName.toLowerCase() === "h1",
    );

    if (allHeadings) {
      // UNWRAP MULTIPLE HEADINGS
      blocks.forEach((block) => {
        if (
          block.nodeType === Node.ELEMENT_NODE &&
          (block as HTMLElement).tagName.toLowerCase() === "h1"
        ) {
          const div = document.createElement("div");
          const el = block as HTMLElement;
          if (!extractContent(el, div)) {
            while (block.firstChild) {
              div.appendChild(block.firstChild);
            }
          }
          block.parentNode?.replaceChild(div, block);
        }
      });
    } else {
      // WRAP MULTIPLE BLOCKS
      blocks.forEach((block) => {
        if (
          block.nodeType === Node.ELEMENT_NODE &&
          (block as HTMLElement).tagName.toLowerCase() === "blockquote"
        ) {
          const div = document.createElement("div");
          while (block.firstChild) {
            div.appendChild(block.firstChild);
          }
          block.parentNode?.replaceChild(div, block);
          block = div;
        }

        if (
          block.nodeType === Node.ELEMENT_NODE &&
          (block as HTMLElement).tagName.toLowerCase() !== "h1"
        ) {
          const h1 = document.createElement("h1");
          const el = block as HTMLElement;
          if (!extractContent(el, h1)) {
            while (block.firstChild) {
              h1.appendChild(block.firstChild);
            }
          }
          block.parentNode?.replaceChild(h1, block);
        }
      });
    }

    const newRange = document.createRange();
    newRange.setStart(range.startContainer, range.startOffset);
    newRange.setEnd(range.endContainer, range.endOffset);
    selection.removeAllRanges();
    selection.addRange(newRange);
  } else {
    // Single line/cursor handling
    let currentBlock: Node | null = range.startContainer;
    while (currentBlock && currentBlock.parentNode !== editorEl) {
      currentBlock = currentBlock.parentNode;
    }

    const isHeading =
      currentBlock &&
      currentBlock.nodeType === Node.ELEMENT_NODE &&
      (currentBlock as HTMLElement).tagName.toLowerCase() === "h1";

    const isQuote =
      currentBlock &&
      currentBlock.nodeType === Node.ELEMENT_NODE &&
      (currentBlock as HTMLElement).tagName.toLowerCase() === "blockquote";

    if (isHeading) {
      // UNWRAP (Heading -> Div)
      const div = document.createElement("div");
      const el = currentBlock as HTMLElement;
      if (!extractContent(el, div)) {
        while (currentBlock!.firstChild) {
          div.appendChild(currentBlock!.firstChild);
        }
      }
      currentBlock!.parentNode?.replaceChild(div, currentBlock!);

      const newRange = document.createRange();
      newRange.selectNodeContents(div);
      newRange.collapse(false);
      selection.removeAllRanges();
      selection.addRange(newRange);
    } else if (isQuote) {
      // Convert quote to heading
      const h1 = document.createElement("h1");
      while (currentBlock!.firstChild) {
        h1.appendChild(currentBlock!.firstChild);
      }
      currentBlock!.parentNode?.replaceChild(h1, currentBlock!);

      const newRange = document.createRange();
      newRange.selectNodeContents(h1);
      newRange.collapse(false);
      selection.removeAllRanges();
      selection.addRange(newRange);
    } else if (currentBlock && currentBlock !== editorEl) {
      // WRAP (Block -> Heading)
      const h1 = document.createElement("h1");

      if (currentBlock.nodeType === Node.ELEMENT_NODE) {
        const element = currentBlock as HTMLElement;
        if (!extractContent(element, h1)) {
          while (element.firstChild) {
            h1.appendChild(element.firstChild);
          }
        }
      } else if (currentBlock.nodeType === Node.TEXT_NODE) {
        h1.textContent = currentBlock.textContent || "";
      }

      currentBlock.parentNode?.replaceChild(h1, currentBlock);

      const newRange = document.createRange();
      newRange.selectNodeContents(h1);
      newRange.collapse(false);
      selection.removeAllRanges();
      selection.addRange(newRange);
    } else if (editorEl.childNodes.length === 0 || range.collapsed) {
      const h1 = document.createElement("h1");
      h1.innerHTML = "<br>";

      if (range.collapsed) {
        range.insertNode(h1);
      } else {
        range.deleteContents();
        range.insertNode(h1);
      }

      const newRange = document.createRange();
      newRange.selectNodeContents(h1);
      newRange.collapse(false);
      selection.removeAllRanges();
      selection.addRange(newRange);
    }
  }

  editor?.dispatchEvent(new Event("input", { bubbles: true }));
}
