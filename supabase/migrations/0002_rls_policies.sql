-- 0002_rls_policies.sql
--
-- Establishes the first explicit RLS policy set for the Aristolegion
-- database. Every table listed in supabase/schema.sql already has RLS
-- enabled with zero policies (verified in production prior to writing this
-- migration) — that is a deliberate lockdown, not an oversight: with no
-- policy, no role except service_role (which bypasses RLS entirely) has any
-- access at all. This migration adds the minimum explicit policy set the
-- public-facing site needs, and nothing more.
--
-- Scope, per Engineering Specification ES-001:
--   publications, essays, newsletter_issues
--     -> anon: SELECT, restricted to status = 'published', nothing else.
--   newsletter_subscribers, inner_circle_applications
--     -> anon: INSERT only. No SELECT, UPDATE, or DELETE.
-- No other role, table, or operation is touched by this migration.
--
-- IMPORTANT — table-level GRANTs are a separate, lower privilege layer than
-- RLS and are NOT part of this migration. As of this writing, the `anon`
-- role has zero table-level GRANTs (no SELECT/INSERT/UPDATE/DELETE) on any
-- of the five tables below — confirmed via information_schema.role_table_
-- grants. A role needs BOTH a table-level GRANT and a passing RLS policy to
-- perform an operation through PostgREST/Supabase client libraries; an RLS
-- policy alone does not grant access. Every current application route reads
-- and writes through SUPABASE_SERVICE_ROLE_KEY server-side (see
-- schema.sql), never the anon key, so this migration changes zero
-- application behavior. If a future change adopts anon-key access from the
-- browser, the corresponding `GRANT SELECT/INSERT ON <table> TO anon;`
-- statements must be added as their own, separately reviewed migration —
-- deliberately not bundled into this one.
--
-- Do NOT modify, replace, or remove public.rls_auto_enable() — the existing
-- event trigger that auto-enables RLS on newly created public-schema
-- tables. It is unrelated to this migration and out of scope; the explicit
-- `enable row level security` statements below are idempotent and simply
-- reaffirm the state that trigger already established.
--
-- ROLLBACK
-- To fully reverse this migration, run the following as a new, forward-
-- numbered migration (never edit this file in place):
--
--   BEGIN;
--   DROP POLICY IF EXISTS publications_anon_select_published ON public.publications;
--   DROP POLICY IF EXISTS essays_anon_select_published ON public.essays;
--   DROP POLICY IF EXISTS newsletter_issues_anon_select_published ON public.newsletter_issues;
--   DROP POLICY IF EXISTS newsletter_subscribers_anon_insert ON public.newsletter_subscribers;
--   DROP POLICY IF EXISTS inner_circle_applications_anon_insert ON public.inner_circle_applications;
--   COMMIT;
--
-- This restores the pre-migration state (RLS enabled, zero policies) for
-- every table. It does not, and should not, disable RLS itself — RLS was
-- already enabled on every table before this migration and should remain
-- enabled regardless of policy count.

BEGIN;

-- -----------------------------------------------------------------------
-- publications
-- -----------------------------------------------------------------------

-- Reaffirm RLS is enabled (idempotent; already enabled in production).
ALTER TABLE public.publications ENABLE ROW LEVEL SECURITY;

-- Safe to re-run: drop before create rather than relying on CREATE OR
-- REPLACE, since Postgres has no CREATE OR REPLACE POLICY.
DROP POLICY IF EXISTS publications_anon_select_published ON public.publications;

-- Anonymous (public-website) visitors may SELECT only published rows.
-- No INSERT/UPDATE/DELETE policy exists for anon on this table — Sanctum
-- writes exclusively through service_role, which bypasses RLS.
CREATE POLICY publications_anon_select_published
  ON public.publications
  FOR SELECT
  TO anon
  USING (status = 'published');

-- -----------------------------------------------------------------------
-- essays
-- -----------------------------------------------------------------------

ALTER TABLE public.essays ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS essays_anon_select_published ON public.essays;

-- Same posture as publications: published-only, read-only, anon-only.
CREATE POLICY essays_anon_select_published
  ON public.essays
  FOR SELECT
  TO anon
  USING (status = 'published');

-- -----------------------------------------------------------------------
-- newsletter_issues
-- -----------------------------------------------------------------------

ALTER TABLE public.newsletter_issues ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS newsletter_issues_anon_select_published ON public.newsletter_issues;

-- Same posture as publications/essays: published-only, read-only, anon-only.
CREATE POLICY newsletter_issues_anon_select_published
  ON public.newsletter_issues
  FOR SELECT
  TO anon
  USING (status = 'published');

-- -----------------------------------------------------------------------
-- newsletter_subscribers
-- -----------------------------------------------------------------------

ALTER TABLE public.newsletter_subscribers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS newsletter_subscribers_anon_insert ON public.newsletter_subscribers;

-- Anonymous visitors may INSERT (subscribe) only. No SELECT policy exists,
-- so anon can never read the subscriber list, another subscriber's email,
-- or their own row back out. No UPDATE/DELETE policy exists, so anon can
-- never modify consent or unsubscribe directly — those flows
-- (/api/unsubscribe/[token], /api/preferences/[token]) are deliberately
-- token-gated and go through service_role, not RLS.
CREATE POLICY newsletter_subscribers_anon_insert
  ON public.newsletter_subscribers
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- -----------------------------------------------------------------------
-- inner_circle_applications
-- -----------------------------------------------------------------------

ALTER TABLE public.inner_circle_applications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS inner_circle_applications_anon_insert ON public.inner_circle_applications;

-- Anonymous applicants may INSERT (apply) only. No SELECT/UPDATE/DELETE
-- policy exists, so an applicant can never read back their own submission,
-- see any other applicant's data, or change an application's status —
-- status review/transitions happen exclusively in Sanctum via service_role.
CREATE POLICY inner_circle_applications_anon_insert
  ON public.inner_circle_applications
  FOR INSERT
  TO anon
  WITH CHECK (true);

COMMIT;
