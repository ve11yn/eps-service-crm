# CRM Flow Audit

This note maps EPS/Gage workflow terms to the current web app areas.

## Inbox

- Owns WhatsApp conversations before they are approved into structured records.
- Conversations should begin as `New Enquiry` and move through `Qualification`.
- AI summaries should support Tanya as an exception manager, not auto-create jobs.

## Requests

- Owns admin review of AI-extracted WhatsApp drafts.
- Review decisions should produce:
  - `Site Visit` lead when inspection is required.
  - `Quote Draft` lead when scope items are ready for admin quote review.
  - `Qualification` lead when more detail is still needed.
- A Project/Job should only be created directly when the customer has approved a quote or admin has confirmed a site visit/job should be opened.

## Review Detail

- Owns validation of customer details, property details, quote scope items, photo intake, and the next workflow step.
- Work items here are quote scope items until the lead is promoted to a project/job.

## Projects

- Owns scheduled and active jobs after customer approval.
- Project/job statuses follow: `Scheduled`, `In Progress`, `QA / Review`, `Invoiced`, `Completed`.

## Schedule

- Owns site visits, scheduled work, and handover dates.

## Worker

- Owns work item execution via worker-facing views or WhatsApp updates.
- Work item statuses follow: `Pending`, `In Progress`, `Completed`, `Deferred`.

## Finance

- Quotes use: `Draft`, `Sent`, `Negotiating`, `Approved`, `Revised`, `Expired/Rejected`.
- Invoices use: `Draft`, `Issued`, `Partially Paid`, `Paid`, `Overdue`, `Cancelled`.
- Payments use: `Pending`, `Processing`, `Paid`, `Refunded`.

## Reports

- Should measure response time from enquiry, quote conversion, active workload, rework/deferred work, and payment follow-up.
