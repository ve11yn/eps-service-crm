# API-Key Rotation Guide

1. Announce a maintenance window and capture the current deployment version.
2. Create the replacement secret in the owning account.
3. Add it to the deployment environment without removing the old key.
4. redeploy and run health, login, database, AI and integration smoke tests.
5. Revoke the old key only after validation.
6. Record actor, timestamp, affected environments and test evidence.

Rotate immediately after staff/vendor offboarding or suspected exposure. Rotate Supabase service role, database password, AI key, Meta tokens, QuickBooks credentials and deployment tokens independently. Never paste secret values into audit notes.
