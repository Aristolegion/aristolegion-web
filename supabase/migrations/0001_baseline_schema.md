# 0001 — Baseline Schema

**Type:** Documentation only. No executable SQL.

## Purpose

This entry marks the point where the Aristolegion database transitions from
undocumented, direct-to-production schema changes to a migration-first
workflow (see [`README.md`](./README.md)).

## Baseline Statement

The production database predates this migration framework. Its schema —
five tables (`publications`, `essays`, `newsletter_issues`,
`newsletter_subscribers`, `inner_circle_applications`), the private
`publications` storage bucket, and the associated `service_role` grants —
was built up incrementally, directly against production, before this
directory existed.

[`../schema.sql`](../schema.sql) is the authoritative baseline document for
that pre-migration history. It is retained as-is and is not superseded or
replaced by this migration framework — it remains the canonical "how do I
stand up this schema from zero" reference, and every table it describes is
confirmed present and RLS-enabled in production as of this writing.

## Verified Production State (at time of writing)

- PostgreSQL 17.6
- All five tables listed above have row level security **enabled**.
- **Zero** RLS policies exist on any table — `service_role` (which bypasses
  RLS entirely) is the only role with any effective access today.
- The `public.rls_auto_enable()` event trigger function exists and
  automatically enables RLS on any newly created table in the `public`
  schema. It is unrelated to this migration framework, predates it, and is
  explicitly out of scope for modification here — see
  [`0002_rls_policies.sql`](./0002_rls_policies.sql) for details.

## Migration Numbering

Because the schema already exists and is fully described by `schema.sql`,
this baseline entry occupies `0001` and contains no SQL to run — there is
nothing to migrate *to* a state that already exists. Executable migration
numbering begins at `0002`. Every migration from `0002` onward is written,
reviewed, and applied through the process described in `README.md`.
