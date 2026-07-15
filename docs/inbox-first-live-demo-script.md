# Inbox-First Live Demonstration Script

This version assumes the demonstration data currently exists only in **Inbox**. The Lead, Quote, Project, assignment, field updates, QA, and payment will be created during the demonstration.

Recommended duration: **15–20 minutes**.

## Fill this in before presenting

- Customer name: **[CUSTOMER NAME]**
- Phone: **[PHONE]**
- Lead title: **[SHORT JOB TITLE]**
- Customer request: **[ONE-SENTENCE REQUEST]**
- Property/address: **[ADDRESS]**
- Quote item 1: **[SERVICE]**
- Quantity and unit: **[QUANTITY / UNIT]**
- Price: **SGD [PRICE]**
- Assigned worker: **[WORKER NAME]**
- Scheduled start/end: **[DATE AND TIME]**
- Before photo: **[FILE READY]**
- After photo: **[FILE READY]**

Keep the customer details visible in the Inbox so they can be copied into the manual Lead if necessary.

## Opening

**On screen:** Sign-in page.

**Say:**

> Today I’ll demonstrate how one customer enquiry moves through the whole business. We’ll start with the Inbox, create and price the opportunity, hand it to the Coordinator and Field Worker, and then return to the office for QA, invoicing, and reporting.

> Some information is captured automatically, while commercial decisions—such as the confirmed scope, quantity, price, assignment, and approval—remain controlled by staff.

---

# Part 1 — Admin / Owner

## 1. Show the Dashboard

**On screen:** Sign in as Admin or Owner and open **Dashboard**.

**Say:**

> This is the office starting point. It shows what needs review, active and completed projects, today’s scheduled work, recent projects, and items that need a decision.

**Point to:** **To Review**, **Active Projects**, **Scheduled Today**, and **Need Action**.

**Say:**

> I’ll begin with a new customer conversation waiting in the Inbox.

## 2. Show the existing Inbox conversation

**On screen:** Open **Inbox** and select the prepared conversation.

**Say:**

> The conversation is stored here as the original source of truth. The office can read the customer’s messages, attachments, and summary together instead of copying information between WhatsApp, notes, and spreadsheets.

**Point to:** The customer name, request, address, attachments, and **Chat Summary**.

**Say:**

> At this stage we have the enquiry, but we still need to verify it and turn it into a qualified Lead.

## 3A. Create the Lead using AI extraction, if available

Use this path when **Generate AI Draft** works.

**On screen:** Click **Generate AI Draft**. Review **AI Extraction**, **Customer and Job**, **Address, Service, and Notes**, and **Create Work Items**.

**Say:**

> The system has converted the conversation into a structured draft. This is not an automatic approval. I compare every important field with the source conversation and correct anything that is missing or inaccurate.

**On screen:** Correct the customer name, phone, address, request, scope, urgency, and work items as needed.

**Say:**

> The automation helps with data entry, while the Admin remains responsible for confirming the customer, property, requested service, and work scope.

**On screen:** Leave **Site visit required** off if the job can be quoted from the available information. Click **Approve Lead**.

**Say:**

> We have enough information to prepare a quote, so I’ll approve the draft. This creates the Lead and moves the enquiry into the commercial workflow.

Then skip to step 4.

## 3B. Create the Lead manually, if AI extraction is unavailable

Use this path when the Inbox is populated but AI processing is not configured.

> **Presenter note:** A manually created Lead follows the same qualification and quote workflow, but it is not automatically linked to the existing Inbox thread. Use step 3A when you want to demonstrate a fully connected Inbox-to-Lead history. Present step 3B as the fallback for enquiries that require manual capture.

**On screen:** Keep the Inbox details available, open **Leads**, and click **New lead**.

**Say:**

> In this demonstration the conversation has been imported, but the structured Lead is not generated automatically. The office creates it from the verified customer information.

**Enter:**

- **Customer name:** [CUSTOMER NAME]
- **Phone / WhatsApp:** [PHONE]
- **Email:** [EMAIL, IF AVAILABLE]
- **Lead title:** [SHORT JOB TITLE]
- **What does the customer need?:** [REQUEST, ADDRESS, AGREED DETAILS, AND MISSING INFORMATION]

**On screen:** Click **Create lead**.

**Say:**

> I’m entering only verified information from the customer conversation. Once saved, this Lead follows the same qualification and quote workflow as an automatically generated Lead.

## 4. Explain the Lead

**On screen:** Show the newly created Lead.

**Say:**

> The Lead is the commercial opportunity. It records who the customer is, what they need, the source of the enquiry, its current status, and the next action.

> From here, we either arrange a site visit or prepare a quote. For this example, we have enough information to quote directly.

## 5. Create and fill in the Quote

**On screen:** Click **Create Draft Quote**.

**Say:**

> The system creates the quote record and links it to the Lead, but the Admin still controls the scope and pricing. This is intentional because quantities, exclusions, and prices require business judgment.

**On screen:** In **Edit Quote**, search the service catalogue.

**Say:**

> I can select an approved service from the pricing catalogue. If the required service is not available, I can add a custom item and enter the price manually.

**On screen:** Add the relevant service or click **Add custom item**. Complete:

- **Title:** [SERVICE]
- **Decision:** Proposed
- **Description:** [WHAT IS INCLUDED]
- **Quantity:** [QUANTITY]
- **Unit:** [ITEM / HOUR / VISIT]
- **Unit price:** SGD [PRICE]
- **Internal / scope notes:** [IMPORTANT OPERATIONAL NOTE]
- **Customer-facing notes:** [EXCLUSIONS, VALIDITY, OR PAYMENT TERMS]
- **Discount:** [0 OR APPROVED AMOUNT]

**Say:**

> I’m confirming the item description, quantity, rate, included scope, and any exclusions. The total is calculated from the included items and discount.

**On screen:** Click **Save Quote**.

**Say:**

> The draft is now saved. Before approval, the customer must receive this specific version.

## 6. Record quote delivery

**On screen:** Optionally show **Download PDF**, then click **Mark Delivered**.

**Enter:**

- **Delivery method:** WhatsApp, email, manual, or other
- **Proof or reference:** [MESSAGE ID / EMAIL SUBJECT / DEMO REFERENCE]
- **Delivery notes:** [OPTIONAL NOTE]

**On screen:** Click **Confirm delivery**.

**Say:**

> We record how the customer received the quote and the supporting reference. This gives us delivery evidence, not just a status change.

> If the customer requests a change, we use Create Revision. We do not overwrite a quote that was already sent.

## 7. Approve the Quote and create the Project

**On screen:** Enter **Project Start** and **Project End**, then click **Approve and Create Project**.

**Say:**

> The customer has accepted this version. I’ll record the planned timing and approve it. The accepted quote now becomes a Project with the agreed scope carried forward.

## 8. Assign the Project

**On screen:** On **Jobs / Projects**, show **Details**, **Project Team**, **Work-item Management**, and **To-do**.

**Say:**

> This Project is now the operational record. The customer, schedule, team, work items, evidence, alerts, costs, QA, and invoice will remain connected here.

**On screen:** In **Project Team**, add the Coordinator or team lead. Under each **To-do** item:

1. Choose **Assigned worker**.
2. Enter the scheduled start and due time.
3. Enable **Require before and after photos**.
4. Click **Save assignment**.

**Say:**

> I’m assigning responsibility at work-item level and making photo evidence mandatory. This item will now appear in the worker’s field workspace.

**Transition:**

> The office has completed the commercial and operational setup. I’ll now show the same job from the Coordinator’s point of view.

---

# Part 2 — Coordinator

## 9. Show Operations Desk

**On screen:** Sign out and sign in as Coordinator. Open **Operations Desk**.

**Say:**

> The Coordinator does not need the sales and finance screens. This view focuses on today’s visits, jobs that still need a worker, current availability, active jobs, and operational exceptions.

**Point to:** **Visits today**, **Need a worker**, **Available now**, **Active jobs**, the live run sheet, and field-team availability.

**On screen:** Open **Team Schedule**, then open the sample job.

**Say:**

> The Coordinator can check the timing, assignment, worker confirmation, customer confirmation, and job details. If a field issue is raised later, it will appear on this Project for follow-up.

**Transition:**

> Now I’ll switch to the worker who received this assignment.

---

# Part 3 — Field Worker

## 10. Show the Field workspace

**On screen:** Sign out and sign in as Field Worker.

**Say:**

> The Field Worker sees a simpler mobile workspace containing only assigned work, today’s route, photo requirements, job details, and field actions.

**Point to:** **Assigned**, **Today**, **Photos due**, the job code, address, schedule, and required evidence.

## 11. Record progress

**On screen:** Click **On the way**.

**Say:**

> The worker records On the way so the office knows travel has started.

**On screen:** Click **Arrived**.

**Say:**

> Arrived confirms the worker is on site.

**On screen:** Click **Start work**.

**Say:**

> Start work changes the item to active execution.

## 12. Upload evidence

**On screen:** Under **Upload evidence**, select **Before**, choose the prepared photo, add a short caption, and click **Upload photo**.

**Say:**

> The Before photo is attached directly to this work item. During the job, the worker can also record defects, materials, access conditions, or clarification images.

## 13. Raise an issue

**On screen:** Under **Report an issue**, choose **Parts required** or **Scope question**.

Use this note:

> The replacement fitting is a different size from the quoted item. Please confirm whether I should purchase the adaptor before continuing.

**On screen:** Click **Alert admin**.

**Say:**

> The worker does not perform unapproved additional work. This structured alert tells the office what happened and what decision is needed.

## 14. Finish the work item

**On screen:** Select **After**, upload the prepared photo, then click **Complete item**.

**Say:**

> The After photo records the completed result. Because evidence is mandatory, the item cannot be completed until the required photo pair is present.

**Transition:**

> The field update is complete. I’ll return to the office to resolve the issue and close the job.

---

# Part 4 — Admin / Owner closeout

## 15. Resolve the worker alert

**On screen:** Sign in as Admin or Owner, open the Project, and scroll to **Worker Updates & Alerts**.

**Say:**

> The office can see the worker’s progress, issue type, note, and time on the same Project.

**Enter this Resolution note:**

> Adaptor approved up to SGD 25. Upload the receipt and proceed.

**On screen:** Click **Resolve alert**.

**Say:**

> The decision is now recorded beside the original alert, creating a clear operational history.

## 16. Show QA and invoicing

**On screen:** Scroll to **Completion Review**.

**Say:**

> QA checks every work item and shows whether the required Before and After evidence exists. Incomplete work can be returned for rework with a specific reason.

**On screen:** Enter the customer sign-off name, completion summary, QA notes, and warranty days. Use **Record sign-off**, then **Approve QA & create invoice** when the Project is ready for QA approval.

**Say:**

> Once the result and evidence are accepted, we record sign-off and approve QA. The invoice is created from the approved, billable work.

## 17. Show Finance

**On screen:** Open **Finance**, then open the invoice.

**Say:**

> Finance keeps the invoice, balance, and payment history connected to the Project. We can download the invoice PDF, record a partial or full payment, and verify the payment evidence before treating it as paid.

**On screen:** Enter the payment amount, method, and reference. Click **Record payment**. If a processing payment is available, show **Verify** and **Receipt PDF**.

## 18. Finish as Owner

**On screen:** Sign in as Owner if necessary and open **Reports**.

**Say:**

> The Owner can review conversion, revenue, outstanding balances, cost, margin, worker utilisation, payment ageing, rework, and service performance.

**On screen:** Open **Configuration → Audit Log → Activity History**.

**Say:**

> Activity History shows who changed what and when. This closes the loop by making approvals, assignments, field decisions, QA, and payments traceable.

## Closing

**Say:**

> That is the complete workflow. The Inbox preserves the original customer conversation. The office verifies and enters the Lead and Quote information that requires judgment. The accepted quote creates the operational Project, the Coordinator schedules and monitors the work, the Field Worker records progress and evidence, and the office completes QA, invoicing, payment, reporting, and audit review in one connected system.

## If the live demo runs long

Stop after these seven highlights:

1. Existing Inbox conversation.
2. **Leads → New lead** or **Generate AI Draft → Approve Lead**.
3. **Create Draft Quote**, add one item, and **Save Quote**.
4. **Mark Delivered → Approve and Create Project**.
5. Coordinator **Operations Desk**.
6. Worker progress, Before/After evidence, and issue alert.
7. Admin alert resolution, QA, and Owner Reports.
