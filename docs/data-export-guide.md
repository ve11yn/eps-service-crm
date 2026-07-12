# Data Export Guide

- Finance: use Finance CSV/QuickBooks exports for accountant handover.
- Reports: apply the required filters and use **Export CSV**.
- Customers/projects: export through the Supabase table editor or a controlled SQL export using owner credentials.
- Media: export the storage object inventory and objects while preserving bucket/path references.
- Audit: filter `/audit`; database owners can export `audit_logs` for a complete archive.

Every export should include its date range, filters, creator, purpose and record count. Treat contact, address, payment and evidence exports as confidential customer data.
