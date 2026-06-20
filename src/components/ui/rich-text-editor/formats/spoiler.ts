// src/components/ui/rich-text-editor/formats/spoiler.ts

export function applySpoiler(range: Range, selection: Selection): void {
  const spoilerWrapper = (
    range.startContainer.nodeType === Node.ELEMENT_NODE
      ? (range.startContainer as HTMLElement)
      : range.startContainer.parentElement
  )?.closest(".spoiler-wrapper");

  if (spoilerWrapper) {
    const content = spoilerWrapper.querySelector(".spoiler-content");
    if (!content) return;

    const selText = selection.toString();
    const fullText = (content.textContent || "").replace(/\u200B/g, "");
    const selectedTextClean = selText.replace(/\u200B/g, "");

    // PARTIAL UNWRAP: Split the spoiler into before, selected, after
    if (
      selectedTextClean &&
      selectedTextClean.length > 0 &&
      selectedTextClean !== fullText
    ) {
      const startOffset = range.startOffset;
      const endOffset = range.endOffset;

      const textNode = content.firstChild as Text;
      if (textNode && textNode.nodeType === Node.TEXT_NODE) {
        const fullContent = textNode.textContent || "";

        const beforeText = fullContent.substring(0, startOffset);
        const selectedText = fullContent.substring(startOffset, endOffset);
        const afterText = fullContent.substring(endOffset);

        const parent = spoilerWrapper.parentNode;
        if (!parent) return;

        const fragment = document.createDocumentFragment();

        if (beforeText && beforeText !== "\u200B") {
          const beforeSpoiler = document.createElement("span");
          beforeSpoiler.className = "spoiler-wrapper inline-block";
          beforeSpoiler.setAttribute("data-spoiler", "true");
          const beforeContent = document.createElement("span");
          beforeContent.className = "spoiler-content";
          beforeContent.textContent = beforeText;
          beforeSpoiler.appendChild(beforeContent);
          fragment.appendChild(beforeSpoiler);
        }

        const plainText = document.createTextNode(selectedText);
        fragment.appendChild(plainText);

        if (afterText && afterText !== "\u200B") {
          const afterSpoiler = document.createElement("span");
          afterSpoiler.className = "spoiler-wrapper inline-block";
          afterSpoiler.setAttribute("data-spoiler", "true");
          const afterContent = document.createElement("span");
          afterContent.className = "spoiler-content";
          afterContent.textContent = afterText;
          afterSpoiler.appendChild(afterContent);
          fragment.appendChild(afterSpoiler);
        }

        parent.replaceChild(fragment, spoilerWrapper);

        const newRange = document.createRange();
        newRange.setStartAfter(plainText);
        newRange.collapse(true);
        selection.removeAllRanges();
        selection.addRange(newRange);
        return;
      }
    }

    // FULL UNWRAP (if no selection or full selection)
    const parent = spoilerWrapper.parentNode;
    while (content.firstChild) {
      parent?.insertBefore(content.firstChild, spoilerWrapper);
    }
    parent?.removeChild(spoilerWrapper);
  } else {
    // Wrap selected text in spoiler
    const selectedText = range.toString();
    const spoilerSpan = document.createElement("span");
    spoilerSpan.className = "spoiler-wrapper inline-block";
    spoilerSpan.setAttribute("data-spoiler", "true");

    const contentSpan = document.createElement("span");
    contentSpan.className = "spoiler-content";
    contentSpan.textContent = selectedText || "\u200B";

    spoilerSpan.appendChild(contentSpan);
    range.deleteContents();
    range.insertNode(spoilerSpan);

    const space = document.createTextNode("\u00A0");
    spoilerSpan.parentNode?.insertBefore(space, spoilerSpan.nextSibling);

    if (!selectedText) {
      range.setStart(contentSpan.firstChild!, 1);
    } else {
      range.setStartAfter(space);
    }
    range.collapse(true);
    selection.removeAllRanges();
    selection.addRange(range);
  }
}
