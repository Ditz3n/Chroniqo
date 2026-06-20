// src/components/ui/rich-text-editor/parse-markdown-to-html.ts

export function parseMarkdownToHTML(
  markdown: string,
  isEditor: boolean = false,
): string {
  let html = markdown;

  // Shield Code Blocks and Inline Code to prevent formatting inside them
  const codeBlocks: string[] = [];
  html = html.replace(/```[ \t]*\n?([\s\S]*?)\n?[ \t]*```/g, (match, code) => {
    const lines = code.split("\n");
    const htmlLines = lines
      .map((line: string) => {
        if (line.trim() === "") return "<div><br></div>";
        // Escape HTML entities to prevent raw HTML execution inside code blocks
        const safeLine = line
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;");
        return `<div>${safeLine}</div>`;
      })
      .join("");
    codeBlocks.push(
      `<pre class="code-block-editor"><code>${htmlLines}</code></pre>`,
    );
    return `__CODEBLOCK_${codeBlocks.length - 1}__`;
  });

  const inlineCodes: string[] = [];
  html = html.replace(/`([^`]*)`/g, (match, code) => {
    const safeCode = code
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
    inlineCodes.push(`<code class="inline-code">${safeCode}</code>`);
    return `__INLINECODE_${inlineCodes.length - 1}__`;
  });

  // Handles \r carriage returns, standard spaces, tabs, AND non-breaking spaces (\u00A0)
  const listRegex =
    /(?:^[ \t\u00A0]*(?:[*+-]|(?:\d+\.)+)[ \t\u00A0]+.*(?:\r?\n|$))+/gm;
  html = html.replace(listRegex, (match) => {
    const lines = match.split(/\r?\n/).filter((l) => l.trim());
    let result = "";
    const stack: { tag: string; depth: number }[] = [];

    lines.forEach((line) => {
      // Match leading spaces, including non-breaking spaces
      const indentMatch = line.match(/^([ \t\u00A0]*)/);
      const spaces = indentMatch ? indentMatch[1].length : 0;
      let depth = Math.floor(spaces / 2) + 1;

      // Handle user explicitly typing "1.1.1."
      const numberMatch = line.match(/^[ \t\u00A0]*((?:\d+\.)+)/);
      const isOrdered = !!numberMatch;
      if (numberMatch) {
        const dots = numberMatch[1].split(".").filter(Boolean).length;
        if (dots > depth) depth = dots;
      }

      depth = Math.min(depth, 5); // Max depth 5
      const tag = isOrdered ? "ol" : "ul";
      const className = isOrdered ? "nested-ol" : "nested-ul";

      // Strip bullet/number markers safely
      const content = line.replace(
        /^[ \t\u00A0]*(?:[*+-]|(?:\d+\.)+)[ \t\u00A0]+/,
        "",
      );

      // Close outdented lists
      while (stack.length > 0 && stack[stack.length - 1].depth > depth) {
        result += `</li></${stack.pop()!.tag}>`;
      }

      // Handle changing list type at the same depth
      if (
        stack.length > 0 &&
        stack[stack.length - 1].depth === depth &&
        stack[stack.length - 1].tag !== tag
      ) {
        result += `</li></${stack.pop()!.tag}>`;
      }

      // Open nested lists
      if (stack.length === 0 || stack[stack.length - 1].depth < depth) {
        const isRoot = stack.length === 0;
        result += `<${tag} class="${className} pl-8 ${isRoot ? "my-2" : ""}">`;
        stack.push({ tag, depth });
      } else {
        result += `</li>`; // Close previous sibling
      }

      result += `<li>${content}`; // Leave open for potential children
    });

    while (stack.length > 0) result += `</li></${stack.pop()!.tag}>`;

    // Restore structural newline if consumed by regex
    if (match.endsWith("\r\n")) result += "\r\n";
    else if (match.endsWith("\n")) result += "\n";

    return result;
  });

  // Spoiler: >!text!<
  html = html.replace(/>!(.+?)!</g, (match, content) => {
    const text = content || "\u200B";
    return `<span class="spoiler-wrapper inline-block" data-spoiler="true"><span class="spoiler-content">${text}</span></span>`;
  });

  // Bold: **text**
  html = html.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");

  // Italic: *text*
  html = html.replace(/\*([^*]+)\*/g, "<em>$1</em>");

  // Strikethrough: ~~text~~
  html = html.replace(/~~([^~]+)~~/g, "<s>$1</s>");

  // Superscript: ^text^
  html = html.replace(/\^([^^]+)\^/g, "<sup>$1</sup>");

  // Links: [text](url)
  html = html.replace(
    /\[([^\]]+)\]\(([^)]+)\)/g,
    '<a href="$2" class="text-brand underline cursor-pointer hover:text-brand/80" data-link="true">$1</a>',
  );

  // Heading: # text up to ###### text
  html = html.replace(/^(#{1,6})\s+(.+)$/gm, (match, hashes, content) => {
    const level = hashes.length;
    let classes = "font-heading my-2 ";

    // Apply appropriate sizes based on heading level
    if (level === 1) classes += "text-2xl font-bold";
    else if (level === 2) classes += "text-xl font-bold";
    else if (level === 3) classes += "text-lg font-semibold";
    else classes += "text-base font-semibold";

    return `<h${level} class='${classes}'>${content}</h${level}>`;
  });

  // Quote
  const quoteRegex = /(?:^>[ \t]*.*(?:\r?\n|$))+/gm;
  html = html.replace(quoteRegex, (match) => {
    const lines = match.split(/\r?\n/);
    const validLines = lines.filter((l) => l.trim().startsWith(">"));
    const content = validLines.map((l) => l.replace(/^>[ \t]*/, "")).join("\n");

    // Check if match ends with newline to preserve spacing
    const suffix = match.endsWith("\r\n")
      ? "\r\n"
      : match.endsWith("\n")
        ? "\n"
        : "";
    return `<blockquote class='border-l-4 border-foreground-40 pl-3 my-2 text-foreground-60'>${content}</blockquote>${suffix}`;
  });

  // Table
  const tableRegex = /((?:^.*\|.*(?:\r?\n|$))+)/gm;
  html = html.replace(tableRegex, (match) => {
    const rows = match.split(/\r?\n/);
    const cleanRows = rows.filter((r) => r.trim());
    if (cleanRows.length < 2) return match;

    const separatorRowIndex = cleanRows.findIndex(
      (r) => /^[\s|:-]+$/.test(r) && r.includes("-"),
    );

    if (separatorRowIndex < 1) return match; // Must have a header row and a separator row

    // Safely isolate the table from any text the regex greedily grabbed above it
    const preTableText = cleanRows.slice(0, separatorRowIndex - 1).join("\n");
    const tableRows = cleanRows.slice(separatorRowIndex - 1);

    const separatorRow = tableRows[1];
    const separatorCells = separatorRow.split("|");
    if (separatorRow.trim().startsWith("|")) separatorCells.shift();
    if (separatorRow.trim().endsWith("|")) separatorCells.pop();

    const alignments: string[] = separatorCells.map((cell) => {
      const trimmed = cell.trim();
      if (trimmed.startsWith(":") && trimmed.endsWith(":")) return "center";
      if (trimmed.endsWith(":")) return "right";
      return "left";
    });

    const table = document.createElement("table");
    if (isEditor) table.className = "editor-table";

    tableRows.forEach((rowText, rowIdx) => {
      if (/^[\s|:-]+$/.test(rowText) && rowText.includes("-")) return;

      const cells = rowText.split("|");
      if (rowText.trim().startsWith("|")) cells.shift();
      if (rowText.trim().endsWith("|")) cells.pop();

      const row = document.createElement("tr");

      cells.forEach((cellText, colIdx) => {
        // In display mode, the first row should be <th> headers
        const cell = document.createElement(
          isEditor ? "td" : rowIdx === 0 ? "th" : "td",
        );
        if (isEditor) cell.className = "editor-table-cell";

        if (alignments.length > colIdx) {
          cell.style.textAlign = alignments[colIdx];
        }

        const text = cellText.trim();

        if (isEditor) {
          const btnContainer = document.createElement("div");
          btnContainer.className = "table-cell-menu-container";
          btnContainer.contentEditable = "false";

          const btn = document.createElement("button");
          btn.className = "table-cell-menu-button";
          btn.type = "button";
          btn.setAttribute("data-table-menu-trigger", "true");
          btn.onpointerdown = (e) => {
            e.preventDefault();
            e.stopPropagation();
          };
          btn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="1"/><circle cx="12" cy="5" r="1"/><circle cx="12" cy="19" r="1"/></svg>`;

          btnContainer.appendChild(btn);
          cell.appendChild(btnContainer);

          const content = document.createElement("div");
          content.className = "table-cell-content";
          content.contentEditable = "true";

          if (alignments.length > colIdx) {
            content.style.textAlign = alignments[colIdx];
          }

          content.innerHTML = text || "<br>";
          cell.appendChild(content);
          cell.contentEditable = "false";
        } else {
          // Display Mode: Just inject the raw text into the <td>/<th>
          cell.innerHTML = text || "<br>";
        }

        row.appendChild(cell);
      });

      table.appendChild(row);
    });

    // Re-attach any normal text that was above the table
    return (preTableText ? preTableText + "\n" : "") + table.outerHTML;
  });

  // Restore Code Blocks and Inline Code
  html = html.replace(
    /__CODEBLOCK_(\d+)__/g,
    (match, index) => codeBlocks[Number(index)],
  );
  html = html.replace(
    /__INLINECODE_(\d+)__/g,
    (match, index) => inlineCodes[Number(index)],
  );

  console.log("[parseMarkdownToHTML] HTML before line break conversion:", html);

  // Convert remaining explicit newlines to <br> to preserve hard line breaks
  html = html.replace(/\n/g, "<br>");

  console.log("[parseMarkdownToHTML] HTML after <br> conversion:", html);

  const tempDiv = document.createElement("div");
  tempDiv.innerHTML = html;

  const blockTags = [
    "DIV",
    "H1",
    "H2",
    "H3",
    "H4",
    "H5",
    "H6",
    "BLOCKQUOTE",
    "PRE",
    "UL",
    "OL",
    "TABLE",
  ];
  const wrappedContent: string[] = [];
  let currentLine: Node[] = [];

  const flushLine = (forceEmpty = false) => {
    if (currentLine.length > 0 || forceEmpty) {
      const div = document.createElement("div");
      currentLine.forEach((n) => div.appendChild(n));
      if (!div.childNodes.length) div.innerHTML = "<br>";
      wrappedContent.push(div.outerHTML);
      currentLine = [];
    }
  };

  let prevWasBlock = false;

  Array.from(tempDiv.childNodes).forEach((node) => {
    if (node.nodeType === Node.ELEMENT_NODE) {
      const el = node as HTMLElement;
      if (el.tagName === "BR") {
        // If we just pushed a block element, ignore the very first BR.
        // Block elements natively break the line, so this BR is just structural markdown padding.
        if (prevWasBlock && currentLine.length === 0) {
          prevWasBlock = false;
          return;
        }
        flushLine(true);
        prevWasBlock = false;
      } else if (blockTags.includes(el.tagName)) {
        flushLine();
        wrappedContent.push(el.outerHTML);
        prevWasBlock = true;
      } else {
        currentLine.push(node.cloneNode(true));
        prevWasBlock = false;
      }
    } else if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent || "";
      if (text) {
        currentLine.push(document.createTextNode(text));
        prevWasBlock = false;
      }
    }
  });

  flushLine();
  return wrappedContent.join("");
}
