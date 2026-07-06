import type { ReactNode } from "react";
import { parseMarkdown } from "@/lib/markdown";

interface MarkdownContentProps {
  content: string;
}

function renderInline(text: string, keyPrefix: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  const pattern = /\*\*(.+?)\*\*|\*(.+?)\*|_(.+?)_/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = 0;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(text.slice(lastIndex, match.index));
    }

    if (match[1] !== undefined) {
      nodes.push(<strong key={`${keyPrefix}-${key++}`}>{match[1]}</strong>);
    } else {
      nodes.push(<em key={`${keyPrefix}-${key++}`}>{match[2] ?? match[3]}</em>);
    }

    lastIndex = pattern.lastIndex;
  }

  if (lastIndex < text.length) {
    nodes.push(text.slice(lastIndex));
  }

  return nodes;
}

export function MarkdownContent({ content }: MarkdownContentProps) {
  const blocks = parseMarkdown(content);

  return (
    <div className="mx-auto max-w-[68ch]">
      {blocks.map((block, index) => {
        const key = `block-${index}`;

        switch (block.type) {
          case "h1":
            return (
              <h1
                key={key}
                className="mt-12 font-display text-3xl font-bold text-charcoal first:mt-0 md:text-4xl"
              >
                {renderInline(block.text, key)}
              </h1>
            );
          case "h2":
            return (
              <h2
                key={key}
                className="mt-12 font-display text-2xl font-semibold text-charcoal first:mt-0 md:text-3xl"
              >
                {renderInline(block.text, key)}
              </h2>
            );
          case "quote":
            return (
              <blockquote
                key={key}
                className="my-10 border-l-2 border-gold pl-6 font-display text-2xl italic leading-snug text-navy md:text-3xl"
              >
                {renderInline(block.text, key)}
              </blockquote>
            );
          case "ul":
            return (
              <ul key={key} className="mt-6 space-y-3 border-l-2 border-gold-muted pl-6">
                {block.items.map((item, itemIndex) => (
                  <li
                    key={`${key}-${itemIndex}`}
                    className="font-body text-lg leading-relaxed text-charcoal/85"
                  >
                    {renderInline(item, `${key}-${itemIndex}`)}
                  </li>
                ))}
              </ul>
            );
          case "ol":
            return (
              <ol key={key} className="mt-6 list-decimal space-y-3 pl-10">
                {block.items.map((item, itemIndex) => (
                  <li
                    key={`${key}-${itemIndex}`}
                    className="font-body text-lg leading-relaxed text-charcoal/85"
                  >
                    {renderInline(item, `${key}-${itemIndex}`)}
                  </li>
                ))}
              </ol>
            );
          default:
            return (
              <p key={key} className="mt-6 font-body text-lg leading-relaxed text-charcoal/85 first:mt-0">
                {renderInline(block.text, key)}
              </p>
            );
        }
      })}
    </div>
  );
}
