# User Acceptance Test Scripts

| ID | Scenario | Expected result |
|---|---|---|
| UAT-01 | Create customer, two properties and owner/tenant relationships | History and primary contact are correct |
| UAT-02 | Create quote from catalogue, edit quantities/discount and revise | Totals and versions are preserved |
| UAT-03 | Approve quote and assign worker/dates | Project and work items are created and visible |
| UAT-04 | Worker uploads before/after photos and completes | Completion is blocked until required evidence exists |
| UAT-05 | Worker raises parts/safety/scope issue | Admin alert appears and resolution is audited |
| UAT-06 | QA returns one item for rework | Item reopens and reason appears in history/reports |
| UAT-07 | Sign off, approve QA and generate invoice | Invoice contains active billable items |
| UAT-08 | Record partial then final payment | Balances and project payment status update |
| UAT-09 | Import Notion samples with duplicates | Duplicates are held for link/skip decision |
| UAT-10 | Filter reports and export CSV | Screen and export use the same selection |
| UAT-11 | Review Audit Log | Actor, timestamp, old and new values are visible |
| UAT-12 | Complete parity and final sign-off | Shutdown approval is blocked until all checks pass |

Record pass/fail evidence in `/migration`. A failed test requires an owner, corrective action and retest date.
