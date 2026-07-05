-- Aristolegion lead-capture schema.
-- Run this once in the Supabase SQL editor for your project.
-- Matches the columns read/written by:
--   app/api/inner-circle/apply/route.ts
--   app/api/newsletter/subscribe/route.ts

create table if not exists inner_circle_applications (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  email text not null,
  current_role text not null,
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

create table if not exists newsletter_subscribers (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  consent boolean not null default false,
  source text,
  created_at timestamptz not null default now()
);

alter table newsletter_subscribers enable row level security;

-- Same posture as above: no anon policies, service role only.
