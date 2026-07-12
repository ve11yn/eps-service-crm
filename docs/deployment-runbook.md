# Deployment Runbook

## Before deployment

1. Review uncommitted changes and migration files.
2. Run `npm run validate`. Run the authenticated staging lifecycle suite with `E2E_BASE_URL` and `E2E_SESSION_COOKIE` before production approval.
3. Back up production before schema/data migrations.
4. Confirm environment variables and accountable approver.

## Deploy

1. Apply migrations with `npx supabase db push`.
2. Deploy the tested commit to Vercel.
3. Verify `/api/health`, authentication and role access.
4. Smoke-test customer, quote, project, worker evidence, QA, invoice, reports and audit flows.

## Rollback

Application rollback uses the previous Vercel deployment. Database migrations require a reviewed forward-fix unless a tested restore has been approved. Record the incident, customer impact, recovery action and follow-up owner.
