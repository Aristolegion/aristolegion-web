-- Aristolegion lead-capture schema.
-- Run this once in the Supabase SQL editor for your project.
-- Matches the columns read/written by:
--   app/api/inner-circle/apply/route.ts
--   app/api/newsletter/subscribe/route.ts

create table if not exists inner_circle_applications (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  email text not null,
  role_title text not null,
  why_join text not null,
  capability_goal text not null,
  contribution text not null,
  status text not null default 'pending',
  created_at timestamptz not null default now()
);

alter table inner_circle_applications enable row level security;

-- Both API routes write via SUPABASE_SERVICE_ROLE_KEY, which bypasses RLS
-- entirely — so no policy grants anon (i.e. a browser holding a public key)
-- any access at all. RLS stays enabled with zero policies as a deliberate
-- lockdown: even a leaked anon key could not read, insert, update, or
-- delete rows directly against Supabase. All access must go through our
-- own server-side validation in the API routes above.
--
-- RLS bypass and table-level GRANTs are separate Postgres privilege layers.
-- This table originally had SELECT/INSERT for service_role but was missing
-- UPDATE/DELETE, which silently broke the Sanctum Pending/Accepted/Rejected
-- status buttons (app/api/sanctum/applications/[id]/route.ts) — every PATCH
-- failed with a permission-denied error. Fixed by granting the missing
-- privileges explicitly; see publications below for the same class of bug.
grant update, delete on public.inner_circle_applications to service_role;

create table if not exists newsletter_subscribers (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  consent boolean not null default false,
  source text,
  created_at timestamptz not null default now()
);

alter table newsletter_subscribers enable row level security;

-- Same posture as above: no anon policies, service role only.

-- Aristolegion publications (Sanctum publication management).
-- Matches the columns read/written by:
--   app/api/sanctum/publications/route.ts
--   app/api/sanctum/publications/[id]/route.ts
--   app/library/page.tsx, app/library/[slug]/page.tsx

create table if not exists publications (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null unique,
  category text not null,
  description text not null,
  pdf_url text,
  cover_image_url text,
  status text not null default 'draft' check (status in ('draft', 'published')),
  published_at timestamptz,
  created_at timestamptz not null default now()
);

alter table publications enable row level security;

-- Same posture as above: no anon policies, service role only. The public
-- /library pages fetch through the service role key too, filtering on
-- status = 'published' in the query itself — visitors never get a path to
-- draft rows because no anon policy grants them a path to *any* rows.
--
-- service_role bypasses RLS, but RLS bypass and table-level GRANTs are
-- separate Postgres privilege layers — bypassing RLS does not imply SELECT/
-- INSERT/UPDATE/DELETE privileges exist. This table was missing all four
-- (see the same issue on inner_circle_applications above). Without this
-- grant, every PostgREST request against this table fails with a
-- permission-denied error — which is exactly what caused the Sanctum
-- "Unable to load some dashboard data" warning until this grant was added.
grant all on public.publications to service_role;

-- Storage: a private "publications" bucket holds PDFs and cover images
-- under two subfolders, keyed by slug:
--   pdfs/<slug>.pdf
--   covers/<slug>-cover.<jpg|png|webp>
-- pdf_url and cover_image_url store these storage paths, not public URLs —
-- the bucket has no public/anon access, so every read (public library page,
-- Sanctum preview/thumbnail) is served through a short-lived signed URL
-- generated server-side with the service role key. Renaming a publication's
-- slug moves the underlying objects to match (see supabaseMoveFile in
-- lib/supabase.ts), so these paths stay in sync with the current slug.
insert into storage.buckets (id, name, public)
values ('publications', 'publications', false)
on conflict (id) do nothing;

-- Aristolegion essays (Sanctum essay management).
-- Matches the columns read/written by:
--   app/api/sanctum/essays/route.ts
--   app/api/sanctum/essays/[id]/route.ts
--   app/essays/page.tsx, app/essays/[slug]/page.tsx

create table if not exists essays (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null unique,
  excerpt text not null,
  content text not null,
  cover_image_url text,
  status text not null default 'draft' check (status in ('draft', 'published')),
  linkedin_url text,
  published_at timestamptz,
  created_at timestamptz not null default now()
);

alter table essays enable row level security;

-- Same posture as publications: no anon policies, service role only, and
-- the full CRUD grant applied up front this time (not after the fact).
grant all on public.essays to service_role;

-- Essay cover images reuse the existing private "publications" bucket under
-- a third subfolder, keyed by slug:
--   essay-covers/<slug>-cover.<jpg|png|webp>
-- Same signed-URL-only read pattern as PDFs and publication covers above —
-- no new bucket needed, no public access, cover_image_url stores the
-- storage path, not a public URL.

-- Aristolegion newsletter issues (Sanctum newsletter publishing engine).
-- Matches the columns read/written by:
--   app/api/sanctum/newsletter-issues/route.ts
--   app/api/sanctum/newsletter-issues/[id]/route.ts
--   app/api/sanctum/newsletter-issues/[id]/send/route.ts
--   app/newsletter/page.tsx, app/newsletter/[slug]/page.tsx

create table if not exists newsletter_issues (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null unique,
  subtitle text not null,
  issue_number text not null,
  content text not null,
  cover_image_url text,
  status text not null default 'draft' check (status in ('draft', 'published')),
  sent_at timestamptz,
  sent_count integer not null default 0,
  created_at timestamptz not null default now()
);

alter table newsletter_issues enable row level security;

-- Same posture as publications/essays: no anon policies, service role only,
-- full CRUD grant applied up front so this table never hits the missing-grant
-- bug class described above.
grant all on public.newsletter_issues to service_role;

-- Newsletter issue cover images reuse the existing private "publications"
-- bucket under a fourth subfolder, keyed by slug:
--   newsletter-covers/<slug>-cover.<jpg|png|webp>
-- Same signed-URL-only read pattern as every other asset in this bucket.
--
-- sent_at / sent_count are set exclusively by the send endpoint, never by the
-- create/edit routes — publishing an issue (making its page live) and
-- sending it to subscribers (emailing them) are deliberately separate
-- actions. The send endpoint refuses to run a second time once sent_at is
-- set, so clicking "Send to Subscribers" can never double-email a list.
