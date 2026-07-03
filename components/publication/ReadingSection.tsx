interface ReadingSectionProps {
  heading?: string;
  paragraphs?: string[];
  list?: string[];
  quote?: string;
  dropCap?: boolean;
}

export function ReadingSection({
  heading,
  paragraphs,
  list,
  quote,
  dropCap = false,
}: ReadingSectionProps) {
  return (
    <div className="mt-12 first:mt-0">
      {heading && (
        <h2 className="font-display text-2xl font-semibold text-charcoal md:text-3xl">
          {heading}
        </h2>
      )}

      {paragraphs?.map((paragraph, index) => (
        <p
          key={index}
          className={`mt-6 font-body text-lg leading-relaxed text-charcoal/85 ${
            dropCap && index === 0
              ? "first-letter:float-left first-letter:mr-3 first-letter:font-display first-letter:text-6xl first-letter:font-semibold first-letter:leading-[0.85] first-letter:text-gold"
              : ""
          }`}
        >
          {paragraph}
        </p>
      ))}

      {quote && (
        <blockquote className="my-10 border-l-2 border-gold pl-6 font-display text-2xl italic leading-snug text-navy md:text-3xl">
          {quote}
        </blockquote>
      )}

      {list && (
        <ul className="mt-6 space-y-3 border-l-2 border-gold-muted pl-6">
          {list.map((item, index) => (
            <li
              key={index}
              className="font-body text-lg leading-relaxed text-charcoal/85"
            >
              {item}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
