// ES-012 Implementation Specification §F — the deterministic lexical
// pre-filter. An optimization only: it is NOT an eligibility criterion,
// NOT a relevance decision, NOT a classifier, and NOT a source of truth
// for Gate A. Its only job is reducing how many Luna calls are made by
// skipping candidates with zero meaningful term overlap with the
// question — Gate A's actual pass/fail never depends on this filter.
//
// Deliberately permissive: it must not become a systematic
// false-negative mechanism for paraphrased or indirectly phrased
// institutional questions, so it only ever screens out the extreme case
// of literally no shared vocabulary at all, never anything more
// aggressive than that.
//
// Default OFF. No evaluation of this filter's false-negative rate has
// been run in this environment (no live model access here), so the
// conservative default is to send every eligible candidate to the full
// Luna judgment (lib/advisor/relevance.ts) unless a caller explicitly
// opts in. This also directly satisfies the requirement that the
// pre-filter be independently bypassable during evaluation — bypassing
// it is simply the default, not a special mode.

const STOPWORDS = new Set([
  "a", "an", "the", "is", "are", "was", "were", "be", "been", "being",
  "of", "to", "in", "on", "at", "for", "with", "by", "as", "and", "or",
  "but", "if", "then", "than", "so", "that", "this", "these", "those",
  "it", "its", "they", "them", "their", "what", "when", "where", "why",
  "how", "who", "whom", "which", "does", "do", "did", "can", "could",
  "would", "should", "will", "shall", "i", "you", "he", "she", "we",
]);

function tokenize(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((token) => token.length > 2 && !STOPWORDS.has(token))
  );
}

/**
 * Returns true iff the question and the candidate's identity+content
 * share at least one non-stopword token. This is deliberately the
 * weakest possible filter — it exists only to skip the rare case of
 * genuinely zero shared vocabulary, never to approximate relevance.
 */
export function passesLexicalPrefilter(question: string, candidateText: string): boolean {
  const questionTokens = tokenize(question);
  if (questionTokens.size === 0) return true; // nothing to filter on — never block for this reason
  const candidateTokens = tokenize(candidateText);
  for (const token of candidateTokens) {
    if (questionTokens.has(token)) return true;
  }
  return false;
}
