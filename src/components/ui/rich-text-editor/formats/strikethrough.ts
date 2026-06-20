// src/components/ui/rich-text-editor/formats/strikethrough.ts

export function applyStrikethrough(): void {
  document.execCommand("strikeThrough");
}
