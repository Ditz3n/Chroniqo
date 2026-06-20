// src/components/ui/rich-text-editor/get-active-formats.ts

// Helper function to check active formats at cursor position or selection
// Returns only formats that are applied to ALL selected content
export function getActiveFormats(): Set<string> {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return new Set();

  const activeFormats = new Set<string>();

  // 2. Block/Custom Formats: Check ancestors of the selection's anchor node
  let node = selection.anchorNode;

  // Check for heading FIRST - this is important
  let currentElement: HTMLElement | null =
    node?.nodeType === Node.TEXT_NODE
      ? (node.parentElement as HTMLElement)
      : (node as HTMLElement);

  while (currentElement && currentElement.nodeType !== Node.DOCUMENT_NODE) {
    // Stop traversal at the editor boundary
    if (currentElement.getAttribute("contenteditable") === "true") break;

    const tagName = currentElement.tagName?.toLowerCase();
    if (tagName === "h1" || tagName === "h2" || tagName === "h3") {
      activeFormats.add("heading");
      // When heading is active, don't check for inline formats
      return activeFormats;
    }
    currentElement = currentElement.parentElement;
  }

  // Only check inline formats if NOT in a heading
  // 1. Standard Formats: Use browser's native queryCommandState
  if (document.queryCommandState("bold")) activeFormats.add("bold");
  if (document.queryCommandState("italic")) activeFormats.add("italic");
  if (document.queryCommandState("strikeThrough"))
    activeFormats.add("strikethrough");

  // Check if cursor is in zero-width space after a link
  if (node && node.nodeType === Node.TEXT_NODE) {
    const textNode = node as Text;
    const offset = selection.anchorOffset;

    // Check if at the start of a zero-width space text node
    if (offset === 0 && textNode.textContent?.charCodeAt(0) === 0x200b) {
      // Check if previous sibling is a link
      const previousSibling = textNode.previousSibling;
      if (previousSibling && previousSibling.nodeName === "A") {
        activeFormats.add("link");
      }
    }
  }

  // Traverse up to find block elements or custom wrappers
  while (node && node.nodeType !== Node.DOCUMENT_NODE) {
    if (node.nodeType === Node.ELEMENT_NODE) {
      const element = node as HTMLElement;
      const tag = element.tagName.toLowerCase();

      // Stop traversal at the editor boundary
      if (element.getAttribute("contenteditable") === "true") break;

      // Check for specific tags/classes
      if (tag === "ul") activeFormats.add("bullet");
      if (tag === "ol") activeFormats.add("numbered");
      if (tag === "blockquote") activeFormats.add("quote");
      if (tag === "pre") activeFormats.add("codeblock");
      if (tag === "a") activeFormats.add("link");
      if (tag === "sup") activeFormats.add("superscript");

      // Inline code (check if not inside pre to distinguish from block)
      if (
        tag === "code" &&
        element.parentElement?.tagName.toLowerCase() !== "pre"
      ) {
        activeFormats.add("code");
      }

      // Spoiler wrapper
      if (
        element.classList.contains("spoiler-wrapper") ||
        element.getAttribute("data-spoiler")
      ) {
        activeFormats.add("spoiler");
      }

      // Table detection
      if (
        tag === "td" ||
        element.classList.contains("editor-table-cell") ||
        element.classList.contains("table-cell-content")
      ) {
        activeFormats.add("table");
      }
    }
    node = node.parentNode;
  }

  return activeFormats;
}
