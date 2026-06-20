// src/components/ui/rich-text-editor/hooks/use-style-stripper.ts

import { useEffect } from "react";

export function useStyleStripper(
  editorRef: React.RefObject<HTMLDivElement | null>,
  isMarkdownMode: boolean,
  onSelectionChange?: (cell: HTMLTableCellElement | null) => void,
) {
  useEffect(() => {
    const editor = editorRef.current;
    if (!editor || isMarkdownMode) return;

    const handleInput = () => {
      // 1. SPOILER CLEANUP: Find all empty spoilers and remove the data-empty attribute when they have content
      const spoilers = editor.querySelectorAll(
        '.spoiler-wrapper[data-empty="true"]',
      );
      spoilers.forEach((spoiler) => {
        const content = spoiler.querySelector(".spoiler-content");
        if (content && content.textContent) {
          // Remove ZWSP and check if there's real content
          const textWithoutZWSP = content.textContent.replace(
            /[\u200B\u00A0]/g,
            "",
          );
          if (textWithoutZWSP.length > 0) {
            spoiler.removeAttribute("data-empty");

            // Remove ZWSP once real text is present
            if (content.textContent.includes("\u200B")) {
              const cleanText = content.textContent.replace(/\u200B/g, "");
              content.textContent = cleanText;

              // Restore cursor position at the end
              const selection = window.getSelection();
              if (selection && selection.rangeCount > 0) {
                const range = selection.getRangeAt(0);
                const textNode = content.firstChild;
                if (textNode && textNode.nodeType === Node.TEXT_NODE) {
                  range.setStart(textNode, cleanText.length);
                  range.collapse(true);
                  selection.removeAllRanges();
                  selection.addRange(range);
                }
              }
            }
          }
        }
      });

      // 2. CONTENT NORMALIZATION: Clean up stray formatting inside spoilers
      const cleanUpSpoilers = editor.querySelectorAll(".spoiler-content");
      cleanUpSpoilers.forEach((content) => {
        const children = Array.from(content.childNodes);
        children.forEach((child) => {
          if (child.nodeType === Node.ELEMENT_NODE) {
            const element = child as HTMLElement;
            // If it's a span with inline styles (background color bleeding), unwrap it
            if (element.tagName === "SPAN" && element.style.length > 0) {
              const textContent = element.textContent || "";
              const textNode = document.createTextNode(textContent);
              content.replaceChild(textNode, element);
            }
          }
        });
        content.normalize();
      });

      // Check if editor is effectively empty
      if (!editor.textContent?.trim() && !editor.querySelector("table")) {
        // Force reset selection state
        onSelectionChange?.(null);
      }

      // 3. ZOMBIE STYLE REMOVAL (The Fix for Invisible Text)
      // Browsers often apply inline styles (like color: white) after deleting formatted text.
      // Since classes are used for everything, strip inline styles to prevent this.
      const elementsWithStyles = editor.querySelectorAll("*[style]");
      const fontTags = editor.querySelectorAll("font"); // Browsers sometimes use <font> tags

      if (elementsWithStyles.length > 0 || fontTags.length > 0) {
        const selection = window.getSelection();
        let savedNode: Node | null = null;
        let savedOffset = 0;

        // Save cursor position
        if (selection && selection.rangeCount > 0) {
          const range = selection.getRangeAt(0);
          savedNode = range.startContainer;
          savedOffset = range.startOffset;
        }

        // Strip styles
        elementsWithStyles.forEach((el) => {
          // Skip table cells (they use style for text-align)
          if (el.tagName === "TD" || el.tagName === "TH") return;

          // Remove the style attribute completely
          el.removeAttribute("style");

          // If it's a span and has no classes left (was only there for style), unwrap it
          if (
            el.tagName === "SPAN" &&
            el.classList.length === 0 &&
            !el.getAttribute("data-spoiler") &&
            !el.getAttribute("data-link")
          ) {
            const parent = el.parentNode;
            if (parent) {
              while (el.firstChild) {
                parent.insertBefore(el.firstChild, el);
              }
              parent.removeChild(el);
            }
          }
        });

        // Unwrap <font> tags completely
        fontTags.forEach((el) => {
          const parent = el.parentNode;
          if (parent) {
            while (el.firstChild) {
              parent.insertBefore(el.firstChild, el);
            }
            parent.removeChild(el);
          }
        });

        // Restore cursor
        // document.contains is checked because unwrapping moves the text node,
        // but the text node object reference remains valid.
        if (selection && savedNode && document.contains(savedNode)) {
          const newRange = document.createRange();
          try {
            newRange.setStart(savedNode, savedOffset);
            newRange.collapse(true);
            selection.removeAllRanges();
            selection.addRange(newRange);
          } catch (e) {
            // Fallback if offset is invalid after DOM manipulation
            console.warn("Could not restore exact cursor position", e);
          }
        }
      }
    };

    editor.addEventListener("input", handleInput);
    return () => editor.removeEventListener("input", handleInput);
  }, [editorRef, isMarkdownMode, onSelectionChange]);
}
