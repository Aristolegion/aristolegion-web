export type MarkdownBlock =
  | { type: "h1" | "h2" | "quote" | "paragraph"; text: string }
  | { type: "ul" | "ol"; items: string[] };

const UNORDERED_ITEM = /^[-*]\s+/;
const ORDERED_ITEM = /^\d+\.\s+/;

/**
 * Minimal, hand-rolled Markdown parser supporting exactly the subset the
 * Sanctum essay editor documents: # / ## headings, **bold**, *italic*,
 * > quotes, and - / 1. lists. Deliberately not a full CommonMark
 * implementation and not a new dependency — see MarkdownContent for the
 * matching renderer.
 */
export function parseMarkdown(content: string): MarkdownBlock[] {
  const lines = content.replace(/\r\n/g, "\n").split("\n");
  const blocks: MarkdownBlock[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (line.trim() === "") {
      i++;
      continue;
    }

    if (line.startsWith("## ")) {
      blocks.push({ type: "h2", text: line.slice(3).trim() });
      i++;
      continue;
    }

    if (line.startsWith("# ")) {
      blocks.push({ type: "h1", text: line.slice(2).trim() });
      i++;
      continue;
    }

    if (line.startsWith("> ")) {
      const quoteLines: string[] = [];
      while (i < lines.length && lines[i].startsWith("> ")) {
        quoteLines.push(lines[i].slice(2).trim());
        i++;
      }
      blocks.push({ type: "quote", text: quoteLines.join(" ") });
      continue;
    }

    if (UNORDERED_ITEM.test(line)) {
      const items: string[] = [];
      while (i < lines.length && UNORDERED_ITEM.test(lines[i])) {
        items.push(lines[i].replace(UNORDERED_ITEM, "").trim());
        i++;
      }
      blocks.push({ type: "ul", items });
      continue;
    }

    if (ORDERED_ITEM.test(line)) {
      const items: string[] = [];
      while (i < lines.length && ORDERED_ITEM.test(lines[i])) {
        items.push(lines[i].replace(ORDERED_ITEM, "").trim());
        i++;
      }
      blocks.push({ type: "ol", items });
      continue;
    }

    const paragraphLines: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() !== "" &&
      !lines[i].startsWith("#") &&
      !lines[i].startsWith(">") &&
      !UNORDERED_ITEM.test(lines[i]) &&
      !ORDERED_ITEM.test(lines[i])
    ) {
      paragraphLines.push(lines[i]);
      i++;
    }
    blocks.push({ type: "paragraph", text: paragraphLines.join(" ") });
  }

  return blocks;
}

// Newsletter issues have no dedicated excerpt column — the send email needs
// one anyway, so it's derived from the parsed body: plain text, inline
// **bold**/*italic* markers stripped, collapsed to a single line and
// truncated at a word boundary.
export function excerptFromMarkdown(content: string, maxLength = 220): string {
  const blocks = parseMarkdown(content);
  const text = blocks
    .map((block) => ("text" in block ? block.text : block.items.join(" ")))
    .join(" ")
    .replace(/\*\*|\*|_/g, "")
    .replace(/\s+/g, " ")
    .trim();

  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength).trimEnd()}…`;
}
