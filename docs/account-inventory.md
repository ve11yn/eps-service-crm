# Account Inventory

| Asset | Owner | Access to retain | Offboarding action |
|---|---|---|---|
| Domain/DNS | Gage company | Owner + named backup | Remove vendor DNS access |
| Vercel hosting | Gage company | Owner + admin | Remove deployment collaborator |
| Supabase database/storage | Gage company | Two owners | Rotate service-role and DB credentials |
| Git repository | Gage company | Two owners | Remove vendor collaborator/deploy key |
| Anthropic API | Gage company | Owner | Rotate API key |
| WhatsApp/Meta | Gage company | Business admins | Remove developer/system user |
| QuickBooks | Gage company | Accountant + owner | Revoke integration token |

Record account URL, billing contact, recovery email, MFA owner, subscription and last-access review in the company password manager. Never store passwords or live secrets in this repository.
