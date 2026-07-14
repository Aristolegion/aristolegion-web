# Database Migrations

This directory is the single source of truth for every change made to the
Aristolegion production database from this point forward. It replaces ad hoc,
undocumented schema changes with a reviewable, ordered, versioned history.

## Migration Philosophy

- **Migration-first.** Every schema or policy change is written as a migration
  file before it is applied to production. Nothing is changed directly in the
  Supabase SQL editor or dashboard without a corresponding file in this
  directory.
- **Additive by default.** Prefer additive changes (new columns, new tables,
  new policies) over destructive ones (dropped columns, dropped tables).
  Destructive changes require explicit sign-off and a documented rollback
  plan, since Supabase Storage objects and existing rows cannot be
  regenerated from source.
- **One concern per migration.** A migration does one thing — e.g. "add RLS
  policies," "add a column," "create a table." Do not bundle unrelated
  schema changes into a single file.
- **Idempotent where practical.** Migrations should be safe to reason about
  in isolation: use `if exists` / `if not exists`, `drop policy if exists`
  before `create policy`, etc., so re-running a migration against a database
  already in the target state does not error.

## Migration Numbering

Migrations are numbered sequentially starting from `0001`, using a
four-digit, zero-padded integer prefix: `0001`, `0002`, `0003`, ...

`0001` is reserved for the baseline documentation (see
[`0001_baseline_schema.md`](./0001_baseline_schema.md)) and contains no
executable SQL, since production predates this migration framework and its
schema is already captured in `../schema.sql`. Executable migrations begin at
`0002`.

Numbers are never reused and never reordered, even if a migration is later
found to be unnecessary — a skipped or superseded number is documented in
place rather than removed, so the sequence always reflects the true order
changes were proposed.

## Naming Convention

```
NNNN_short_description.sql
NNNN_short_description.md   (documentation-only entries)
```

- `NNNN` — the four-digit sequence number.
- `short_description` — lowercase, underscore-separated, describing the
  change (e.g. `rls_policies`, `add_publication_tags`, `create_authors_table`).
- `.sql` for executable migrations, `.md` for documentation-only entries such
  as the baseline record.

## Review Process

1. A migration is written as a standalone file in this directory, on a
   feature branch — never committed directly to `main`.
2. The migration is reviewed like any other code change: read the SQL
   top to bottom, confirm it matches its stated intent, and confirm it does
   not silently affect tables or rows outside its documented scope.
3. Review specifically checks for:
   - Every DDL/DML statement wrapped in an explicit transaction
     (`BEGIN` / `COMMIT`), unless the statement type cannot run inside one
     (e.g. `CREATE INDEX CONCURRENTLY`).
   - No destructive statement (`DROP TABLE`, `DROP COLUMN`, `TRUNCATE`)
     without an explicit rollback note and sign-off.
   - RLS and privilege changes are least-privilege: grant only what the
     stated use case requires.
4. Once approved and merged, the migration is applied to production in the
   order its number implies — a migration is never applied out of sequence.

## Production Workflow

- Migrations are applied to production only after merge to `main`.
- Apply migrations one at a time, in numeric order, verifying the result
  (e.g. via `pg_policies`, `information_schema`, or the Supabase advisors)
  before moving to the next.
- After applying a migration, confirm application behavior is unchanged
  unless the migration was explicitly intended to change it.
- Record of applied migrations lives in Supabase's own migration history
  (`supabase_migrations.schema_migrations`); this directory is the
  reviewable source, that table is the applied record. They should always
  agree — if they diverge, reconcile before writing the next migration.

## Rollback Expectations

- Every migration should include a comment block describing how to reverse
  it (e.g. the exact `DROP POLICY` / `ALTER TABLE ... DROP COLUMN`
  statements), even if that reversal is not itself committed as a file.
- Additive migrations (new column, new policy) are generally safe to roll
  back by removing what they added.
- Destructive migrations may not be safely reversible (dropped data cannot
  be un-dropped) — their rollback comment must say so explicitly rather than
  imply a reversal that would lose data.
- A rollback is itself applied as a new, forward-numbered migration — the
  history is never edited or deleted to "undo" a change.
