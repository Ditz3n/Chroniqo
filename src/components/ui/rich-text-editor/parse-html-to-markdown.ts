// src/components/ui/rich-text-editor/parse-html-to-markdown.ts

export function parseHTMLToMarkdown(html: string): string {
  const temp = document.createElement("div");
  temp.innerHTML = html;

  const processNode = (node: Node): string => {
    if (node.nodeType === Node.TEXT_NODE) {
      return (node.textContent || "").replace(/\u200B/g, "");
    }

    if (node.nodeType === Node.ELEMENT_NODE) {
      const element = node as HTMLElement;

      // Handle Table specifically
      if (element.tagName === "TABLE") {
        const rows = Array.from(element.querySelectorAll("tr"));
        if (rows.length === 0) return "";

        const alignments: string[] = [];
        const firstRowCells = rows[0].querySelectorAll("td, th");
        firstRowCells.forEach((cell) => {
          const contentDiv = cell.querySelector(
            ".table-cell-content",
          ) as HTMLElement;
          // Extract alignment from whichever element successfully retained the style property
          const align =
            contentDiv?.style.textAlign ||
            (cell as HTMLElement).style.textAlign ||
            "";
          alignments.push(align.trim() || "left");
        });

        let tableMd = "";

        rows.forEach((row, rowIndex) => {
          const cells = Array.from(row.querySelectorAll("td, th"));
          const rowContent = cells
            .map((cell) => {
              const contentDiv = cell.querySelector(".table-cell-content");
              if (contentDiv) {
                const rawMd = Array.from(contentDiv.childNodes)
                  .map(processNode)
                  .join("");
                // Convert newlines to literal <br> tags to preserve markdown table structure
                return rawMd.replace(/\n/g, "<br>").trim();
              }
              return (cell.textContent?.trim() || "").replace(/\n/g, "<br>");
            })
            .join(" | ");

          tableMd += `| ${rowContent} |\n`;

          if (rowIndex === 0) {
            const separator = alignments
              .map((align) => {
                if (align === "center") return ":---:";
                if (align === "right") return "---:";
                return ":---";
              })
              .join(" | ");
            tableMd += `| ${separator} |\n`;
          }
        });

        return tableMd;
      }

      // Handle Code Block specifically
      if (element.tagName === "PRE") {
        const codeElement = element.querySelector("code");
        if (codeElement) {
          const clone = codeElement.cloneNode(true) as HTMLElement;
          const divs = Array.from(clone.querySelectorAll("div"));

          if (divs.length > 0) {
            divs.forEach((div, index) => {
              const isJustBr =
                div.childNodes.length === 1 &&
                div.firstChild?.nodeName === "BR";
              if (isJustBr) {
                div.textContent = "";
              } else {
                div
                  .querySelectorAll("br")
                  .forEach((br) => br.replaceWith("\n"));
              }

              const text = div.textContent || "";
              if (index === 0) {
                div.replaceWith(text);
              } else {
                div.replaceWith("\n" + text);
              }
            });
          } else {
            clone.querySelectorAll("br").forEach((br) => br.replaceWith("\n"));
          }

          const codeContent = clone.textContent || "";

          // Remove zero-width spaces and trailing linebreaks before formatting
          const cleanContent = codeContent
            .replace(/\u200B/g, "")
            .replace(/\n$/, "");

          if (!cleanContent.trim()) return `\`\`\`\n\n\`\`\`\n`;
          return `\`\`\`\n${cleanContent}\n\`\`\`\n`;
        }
        return `\`\`\`\n${element.textContent || ""}\n\`\`\`\n`;
      }

      const children = Array.from(element.childNodes).map(processNode).join("");

      switch (element.tagName) {
        case "STRONG":
        case "B":
          return `**${children}**`;
        case "EM":
        case "I":
          return `*${children}*`;
        case "S":
        case "STRIKE":
          return `~~${children}~~`;
        case "SUP":
          return `^${children}^`;
        case "H1":
          return `# ${children}\n`;
        case "H2":
          return `## ${children}\n`;
        case "H3":
          return `### ${children}\n`;
        case "H4":
          return `#### ${children}\n`;
        case "H5":
          return `##### ${children}\n`;
        case "H6":
          return `###### ${children}\n`;
        case "A":
          const href = element.getAttribute("href") || "";
          return `[${children}](${href})`;
        case "BLOCKQUOTE": {
          const lines = children.split("\n");
          // Remove the last empty line if it was added by a trailing BR or P
          if (lines.length > 0 && lines[lines.length - 1] === "") {
            lines.pop();
          }
          if (lines.length === 0) return "> \n";
          return lines.map((line) => `> ${line}`).join("\n") + "\n";
        }
        case "CODE":
          if (element.parentElement?.tagName === "PRE") return children;
          return `\`${children}\``;
        case "LI":
          // 1. Ignore phantom wrappers completely, just process their children
          if (element.classList.contains("phantom-wrapper")) {
            return Array.from(element.childNodes).map(processNode).join("");
          }

          // 2. Calculate precise depth for space indentation
          let depth = 0;
          let p = element.parentElement;
          while (p && p.getAttribute("contenteditable") !== "true") {
            if (p.tagName === "UL" || p.tagName === "OL") depth++;
            p = p.parentElement;
          }
          const indent = "  ".repeat(Math.max(0, depth - 1));

          // 3. Determine prefix (* vs 1.1.1.)
          let prefix = "* ";
          if (element.parentElement?.tagName === "OL") {
            let curr: HTMLElement | null = element;
            const indices: number[] = [];

            // Climb the tree, counting siblings at each level to build "1.1.1"
            while (curr && curr.tagName === "LI") {
              let index = 1;
              let sibling = curr.previousElementSibling;
              while (sibling) {
                if (
                  sibling.tagName === "LI" &&
                  !sibling.classList.contains("phantom-wrapper")
                ) {
                  index++;
                }
                sibling = sibling.previousElementSibling;
              }
              indices.unshift(index);

              const parentList = curr.parentElement;
              if (parentList && parentList.parentElement?.tagName === "LI") {
                curr = parentList.parentElement as HTMLElement;
              } else {
                break;
              }
            }
            prefix = indices.join(".") + ". ";
          }

          // 4. Process content (Separate inline text from nested blocks)
          let inlineContent = "";
          let blockContent = "";

          Array.from(element.childNodes).forEach((child) => {
            const childHtml = processNode(child);
            if (
              child.nodeType === Node.ELEMENT_NODE &&
              ["UL", "OL"].includes((child as HTMLElement).tagName)
            ) {
              blockContent += childHtml;
            } else {
              inlineContent += childHtml;
            }
          });

          inlineContent = inlineContent.replace(/\n+$/, "");

          // Drop empty items
          if (!inlineContent.trim() && !blockContent.trim()) return "";

          // 5. Assemble final string
          let result = `${indent}${prefix}${inlineContent}\n`;
          if (blockContent) result += blockContent;

          return result;
        case "UL":
        case "OL":
          return children;
        case "SPAN":
          if (element.classList.contains("spoiler-wrapper")) {
            const content =
              element.querySelector(".spoiler-content")?.textContent || "";
            return `>!${content.replace(/\u200B/g, "")}!<`;
          }
          return children;
        case "BR":
          // Ignore trailing BRs that contenteditable uses for layout
          if (element === element.parentElement?.lastChild) return "";
          return "\n";
        case "DIV":
        case "P":
          if (element.classList.contains("table-cell-menu-container"))
            return "";
          // Empty div line
          if (
            element.childNodes.length === 1 &&
            element.firstChild?.nodeName === "BR"
          ) {
            return "\n";
          }
          return children + "\n";
        default:
          return children;
      }
    }
    return "";
  };

  let markdown = "";
  const isBlock = (n: Node) =>
    n.nodeType === Node.ELEMENT_NODE &&
    [
      "DIV",
      "P",
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
    ].includes((n as HTMLElement).tagName);

  Array.from(temp.childNodes).forEach((node, i, arr) => {
    // Add a newline if transitioning from an inline text sequence to a block element
    if (i > 0 && isBlock(node) && !isBlock(arr[i - 1])) {
      markdown += "\n";
    }
    markdown += processNode(node);
  });

  // Compress excessive newlines globally, while protecting code blocks
  const parts = markdown.split(/(```[\s\S]*?```)/g);
  const finalMarkdown = parts
    .map((part, index) => {
      // Even indices are standard text, odd indices are captured code blocks
      if (index % 2 === 0) {
        return part.replace(/\n{3,}/g, "\n\n");
      }
      return part; // Leave code blocks completely untouched
    })
    .join("");

  return finalMarkdown.replace(/\n+$/g, "");
}
