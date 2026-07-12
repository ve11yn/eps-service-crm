# Backup and Restore Procedure

## Backup

1. Confirm Supabase automated backups and retention in the owner account.
2. Before releases/migrations, create a database dump with `supabase db dump --linked -f backup.sql`.
3. Export private and CRM media storage inventories and confirm object retention.
4. Store encrypted backups in a Gage-owned location separate from production.

## Restore drill

1. Create an isolated Supabase recovery project.
2. Restore schema/data, copy a sampled storage set and configure a non-production deployment.
3. Validate record counts, foreign keys, customer/project histories, invoices and signed media URLs.
4. Run the lifecycle tests and document recovery time/data loss.

Never test a restore over production. Perform and record a restore drill at least quarterly.
