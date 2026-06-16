
## What is included

- ordered SQL migrations in `supabase/migrations/`
- reference data inserts inside migrations
- storage bucket creation
- baseline authenticated RLS policies

## Migration order

1. `202606130001_extensions_and_helpers.sql`
2. `202606130002_lookup_tables.sql`
3. `202606130003_core_crm_tables.sql`
4. `202606130004_operational_workflow_tables.sql`
5. `202606130005_commercial_and_media_tables.sql`
6. `202606130006_rls_and_storage.sql`

## How to use with Supabase CLI

1. Create a new Supabase project.
2. In the repo root, initialize Supabase locally if you have not already:

```bash
supabase init
```

3. Link the repo to the target Supabase project:

```bash
supabase link --project-ref <your-project-ref>
```

4. Push the migrations:

```bash
supabase db push
```

5. If you want to inspect the generated schema locally first:

```bash
supabase db reset
```

## Applying to another Supabase account

Because the schema is stored as SQL migrations in git, you can repeat the same process on another Supabase project:

```bash
supabase link --project-ref <other-project-ref>
supabase db push
```

The lookup values are seeded by the migrations themselves, so every clean project gets the same statuses, roles, and reference data.

## Migrating live transactional data

These migrations recreate the schema and reference data. They do not automatically move live customer data such as projects, messages, or payments between Supabase accounts.

For live data migration later, use a database dump from the source project after the schema is already present in the target project.

## Notes

- This schema assumes an internal staff-only CRM.
- `profiles.id` references `auth.users(id)`.
- Before/after photos are linked to `project_items` through `media_assets`.
- QuickBooks sync fields are included where the workflow requires them.

