-- 0006_promote_static_content.sql
--
-- ES-008A: Static Content Promotion. Migrates the repository's remaining
-- static knowledge content — 3 static Essays (lib/content/essays.ts) and 1
-- static Publication, "The Glass Partition" (lib/content/library.ts) —
-- into the canonical `essays` and `publications` tables established in
-- supabase/schema.sql, per EDR-001 ("Supabase becomes the canonical
-- knowledge repository... Static TypeScript files are a transitional
-- compatibility layer and will be retired after migration and cutover").
--
-- Content is copied verbatim from the static source files. No content is
-- authored, paraphrased, or invented by this migration.
--
-- SCHEMA ADDITIONS — three nullable, additive columns on `publications`,
-- identified during ES-008A repository inspection as structural gaps the
-- existing schema does not cover:
--
--   1. `content jsonb` — "The Glass Partition" has rich, multi-section
--      body content (heading/paragraphs/quote per section, the same shape
--      as lib/content/types.ts's PublicationSection[]) with nowhere to
--      live: `publications` has no column capable of holding sectioned
--      long-form content (intelligence_brief/central_question/key_insights
--      are structured editorial metadata, not article body text). Mirrors
--      the existing key_insights/framework jsonb columns' pattern.
--   2. `external_link_label text` / `external_link_url text` — "The Glass
--      Partition" is sold externally (Amazon Kindle) rather than hosted as
--      a PDF; the existing pdf_url-driven "Read Publication" / "Download
--      PDF" actions have no equivalent for an external-only work.
--
-- No changes to `essays`. Repository inspection found the static essays'
-- title/excerpt/content map cleanly onto the existing essays schema
-- (title, excerpt, content, cover_image_url, status, linkedin_url,
-- published_at). Note, disclosed here rather than worked around: the
-- static Essay type additionally carries subtitle, category, and
-- readingTime, none of which the essays table or HostedEssayLayout
-- render — this is the existing, already-established shape of every
-- Sanctum-authored essay (no hosted essay has ever had these fields), not
-- a gap introduced by this migration. Widening the essays content model
-- itself is a separate, broader decision outside ES-008A's scope
-- (Database-layer content promotion into the *existing* schema) and is
-- left for CTO review — see the ES-008A completion report.
--
-- ROLLBACK
-- To fully reverse this migration, run the following as a new, forward-
-- numbered migration (never edit this file in place):
--
--   BEGIN;
--   DELETE FROM public.essays WHERE slug IN (
--     'judgment-in-the-age-of-information-abundance',
--     'capability-over-credentials',
--     'the-return-of-deep-work'
--   );
--   DELETE FROM public.publications WHERE slug = 'the-glass-partition';
--   ALTER TABLE public.publications DROP COLUMN IF EXISTS content;
--   ALTER TABLE public.publications DROP COLUMN IF EXISTS external_link_label;
--   ALTER TABLE public.publications DROP COLUMN IF EXISTS external_link_url;
--   COMMIT;
--
-- Safe: the three new columns are nullable and, prior to this migration,
-- no row in `publications` populates them, so dropping them loses no data
-- beyond what this migration itself inserted. The DELETEs remove exactly
-- the 4 rows this migration inserts, identified by their stable slugs, and
-- touch no other row. This migration and the above rollback were validated
-- together in a single, uncommitted transaction against production before
-- this file was written — see the ES-008A completion report / PR body for
-- the validation transcript.

BEGIN;

-- -----------------------------------------------------------------------
-- Schema additions on publications
-- -----------------------------------------------------------------------

alter table publications add column if not exists content jsonb;
alter table publications add column if not exists external_link_label text;
alter table publications add column if not exists external_link_url text;

-- -----------------------------------------------------------------------
-- Essays — copied verbatim from lib/content/essays.ts
-- -----------------------------------------------------------------------
-- `content` is a Markdown conversion of each essay's `sections` array,
-- using exactly the grammar lib/markdown.ts parses (## headings, blank-
-- line-separated paragraphs, "> " block quotes) — the same format every
-- Sanctum-authored essay already uses. Heading/paragraph/quote text is
-- unchanged from the static source; only the structural representation
-- (typed sections -> Markdown) changes, matching the storage format the
-- canonical table requires.

insert into essays (title, slug, excerpt, content, status, published_at) values
(
  'Judgment in the Age of Information Abundance',
  'judgment-in-the-age-of-information-abundance',
  'Information abundance did not solve the judgment problem — it revealed how large that problem always was.',
  E'## The Abundance Problem\n\nThere has never been more information available to more people, and there has rarely been less consensus about what any of it means. The scarce resource was supposed to be data. It turned out to be judgment — the capacity to weigh evidence, discount noise, and decide well under uncertainty.\n\nThis is not a nostalgia essay. Information abundance is, on balance, a genuine gain. But it has quietly shifted where the real advantage lives: not in who has access to more information, but in who can process it into better decisions faster than everyone else drowning in the same feed.\n\n## Why More Data Rarely Means Better Decisions\n\nGive a person twice as much information and, past a certain point, you do not get twice as much clarity. You get twice as much to sort, weigh, and discard — and most people were never taught how to do that sorting well. The result is a strange paradox: institutions and individuals awash in data, making decisions that are, if anything, slower and more anxious than a generation ago.\n\n> Abundance did not solve the judgment problem. It revealed how large the judgment problem always was.\n\n## Judgment as a Trainable Discipline\n\nThe encouraging finding, if there is one, is that judgment is not a fixed trait. It behaves more like a compounding skill — built through deliberate exposure to real decisions, honest feedback, and the willingness to be wrong in public before you are right in private.\n\nAristolegion treats this as a founding premise: an institution that helps people practice judgment deliberately has more to offer, in an age of abundance, than one more feed optimized for engagement.\n\n## A Closing Thought\n\nThe individuals and institutions that thrive from here will not be the ones with the most information. They will be the ones who built, deliberately and over time, the judgment to know what to do with it.',
  'published',
  '2026-03-10T00:00:00Z'
),
(
  'Capability Over Credentials',
  'capability-over-credentials',
  'A credential is a claim, not a demonstration — and the gap between the two is widening.',
  E'## The Proxy Problem\n\nA credential is a claim, not a demonstration. For most of the last century, that distinction did not matter much, because credentials were scarce enough to function as a reasonably reliable proxy for capability. That scarcity is gone.\n\nWhat remains is a widening fracture between what a degree or certificate certifies and what a role actually requires — a fracture serious enough to warrant its own research, and serious enough that it will not close on its own.\n\n## Why the Old Signal Is Failing\n\nCredential issuance has expanded far faster than demonstrated capability. When everyone has the credential, the credential stops discriminating — and employers know it, even when their hiring processes have not yet caught up.\n\n> A signal that everyone can obtain is no longer a signal. It is a cost of entry.\n\n## What Replaces the Credential\n\nThe replacement is not a better credential. It is a better instrument for demonstrating capability directly — through published work, applied judgment, and a track record that can be inspected rather than merely claimed.\n\nThis is a slower path than collecting certificates. It is also, for the individuals willing to walk it, a far more durable one.\n\n## A Closing Thought\n\nCapability compounds. Credentials expire the moment the next cohort catches up. Institutions and individuals who understand the difference now will have a meaningful head start over those who do not.',
  'published',
  '2026-05-05T00:00:00Z'
),
(
  'The Return of Deep Work',
  'the-return-of-deep-work',
  'As fragmented, shallow work is automated away, sustained attention becomes the scarcest competitive advantage.',
  E'## The Fragmentation of Attention\n\nMost modern work is now organized around interruption: notifications, meetings scheduled in the gaps between other meetings, and a general expectation of continuous availability. The cost is rarely measured directly, because it does not show up as a single dramatic failure. It shows up as a slow erosion of the capacity for sustained, difficult thought.\n\nThat erosion is expensive. The work that actually compounds — research, writing, strategy, judgment — has never rewarded fragmented attention. It has only ever rewarded depth.\n\n## Why Depth Is Becoming a Competitive Advantage\n\nAs automation and AI absorb more of the fragmented, shallow, easily-specified work, what remains disproportionately valuable is the kind of thinking that cannot be rushed or parallelized: original analysis, careful writing, and judgment formed over long, uninterrupted stretches of attention.\n\n> The scarcest resource in a distracted economy is not time. It is the capacity to use time well.\n\n## Rebuilding the Capacity for Depth\n\nDeep work is a trained capacity, not a personality trait. It degrades with disuse and strengthens with deliberate practice — long blocks of undistracted attention, applied consistently, to work that actually matters.\n\nAristolegion treats this as more than a productivity tactic. It is close to a precondition for the kind of judgment and capability the institution exists to cultivate.\n\n## A Closing Thought\n\nThe professionals who will matter most over the next decade will not be the ones who answered fastest. They will be the ones who could still think clearly, at length, after everyone else had stopped trying.',
  'published',
  '2026-06-25T00:00:00Z'
);

-- -----------------------------------------------------------------------
-- Publications — "The Glass Partition", copied verbatim from
-- lib/content/library.ts
-- -----------------------------------------------------------------------
-- `description` uses the static publication's `subtitle` field, matching
-- how app/library/[slug]/page.tsx's toTemplateDataFromStatic already maps
-- description <- subtitle for this exact publication today (the hosted
-- and static rendering paths stay behaviorally consistent). `content`
-- holds the sections array verbatim, unchanged in shape, for
-- toTemplateDataFromHosted's readingSections. `cover_image_url` stores the
-- existing local public asset path as-is (not a Supabase Storage path) —
-- this is a genuine storage-location mismatch inspection surfaced: the
-- asset itself is not being moved into Supabase Storage by this
-- migration, only its existing reference is preserved. Application code
-- in this same change teaches the publication detail route to recognize a
-- leading "/" as a local asset rather than a Storage object key.

insert into publications (
  title, slug, category, description, cover_image_url, status, published_at,
  content, external_link_label, external_link_url
) values (
  'The Glass Partition',
  'the-glass-partition',
  'Novel',
  'A study of invisible barriers in modern institutions, told as reflective fiction.',
  '/images/glass-partition.png',
  'published',
  '2026-02-14T00:00:00Z',
  '[
    {
      "heading": "I.",
      "paragraphs": [
        "The thirty-eighth floor was glass on every side, and Mira had stopped noticing the view years ago. What she noticed instead was the partition — a single pane separating the executive floor from the one beneath it, thin enough to see through, solid enough that no sound had ever crossed it in six years.",
        "She had worked beneath that glass long before she was invited above it. The invitation changed nothing about the building. It changed everything about how she read a room."
      ],
      "quote": "The partition was never about keeping people out. It was about deciding, quietly, who was already in."
    },
    {
      "heading": "II.",
      "paragraphs": [
        "From above, the floor below looked orderly — rows of desks, the low hum of people trying to be noticed by someone who could not see them. From below, the floor above had looked the same way for six years: closer, brighter, and entirely silent.",
        "Mira understood, standing on the new side of the glass for the first time, that she had spent six years mistaking proximity for access. The partition had never moved. She had simply been handed a door."
      ]
    },
    {
      "heading": "A Note on This Excerpt",
      "paragraphs": [
        "The Glass Partition is a full-length work of reflective fiction exploring the quiet architecture of modern institutions — who is granted access, who is merely granted a view, and what changes once the glass is crossed. The pages above are drawn from its opening chapter."
      ]
    }
  ]'::jsonb,
  'Read on Amazon Kindle',
  'https://www.amazon.in/dp/B0GSSMVXPX'
);

COMMIT;
