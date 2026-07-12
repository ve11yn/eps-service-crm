import "server-only";

import { getLeadDetail } from "@/backend/services/leads/get-lead-detail";
import { getProjectDetail } from "@/backend/services/projects/get-project-detail";
import {
  getLatestReviewDraftByLeadId,
  getQuoteDetail,
  getReviewDraftById,
  listMessagesByThreadId,
  listQuotesByLeadId,
} from "@/backend/repositories";
import {
  getProjectOperatingBoard,
  type ProjectLifecycleStage,
  type ProjectOperatingItem,
} from "@/backend/services/projects/get-project-operating-board";
import {
  parseConversationMessages,
  parseLeadExtraction,
} from "@/frontend/lib/review-drafts";

export type ProjectWorkspaceKind = "draft" | "lead" | "quote" | "project";

export type ProjectWorkspaceMessage = {
  id: string;
  direction: "inbound" | "outbound";
  author: string;
  body: string;
  at: string | null;
};

export type ProjectWorkspaceWorkItem = {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  assignedTo: string;
  quotedAmount: number | null;
  actualCost: number | null;
  scheduledAt: string | null;
  completedAt: string | null;
  note: string | null;
  mediaCount: number;
};

export type ProjectWorkspacePhoto = {
  id: string;
  url: string | null;
  caption: string;
  type: string;
};

export type ProjectWorkspaceTimelineEvent = {
  label: string;
  at: string | null;
};

export type ProjectWorkspace = {
  routeId: string;
  kind: ProjectWorkspaceKind;
  sourceId: string;
  title: string;
  customerName: string;
  propertyLabel: string;
  stage: string;
  stageLabel: string;
  priority: string;
  assignedTeam: string[];
  health: ProjectOperatingItem["health"];
  nextAction: string;
  scheduledDate: string | null;
  paymentStatus: string;
  quoteValue: number | null;
  overview: {
    summary: string;
    decision: string;
    latestActivity: string;
    source: string;
  };
  conversation: {
    threadId: string | null;
    messages: ProjectWorkspaceMessage[];
  };
  workItems: ProjectWorkspaceWorkItem[];
  quote: {
    id: string | null;
    status: string | null;
    version: number | null;
    total: number | null;
    items: ProjectWorkspaceWorkItem[];
  };
  schedule: {
    startAt: string | null;
    endAt: string | null;
    handoverAt: string | null;
    preferredDate: string | null;
    preferredWindow: string | null;
    team: string[];
  };
  photos: ProjectWorkspacePhoto[];
  finance: {
    quoteValue: number | null;
    invoiceTotal: number;
    paidTotal: number;
    outstanding: number;
    paymentStatus: string;
    invoiceNumber: string | null;
  };
  timeline: ProjectWorkspaceTimelineEvent[];
  actions: {
    reviewDraftId: string | null;
    leadId: string | null;
    leadStatus: string | null;
    latestQuoteId: string | null;
    quoteId: string | null;
    quoteStatus: string | null;
    quoteProjectId: string | null;
    threadId: string | null;
  };
};

// Supabase nested selections vary by source record and are normalized here.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyRecord = Record<string, any>;

type ParsedWorkspaceId = {
  kind: ProjectWorkspaceKind;
  sourceId: string;
  operatingId: string;
};

const defaultStageLabels: Record<string, string> = {
  new_enquiry: "New Enquiry",
  qualification: "Qualification",
  site_visit: "Site Visit",
  quote_draft: "Quote Draft",
  awaiting_approval: "Awaiting Approval",
  scheduled: "Scheduled",
  in_progress: "In Progress",
  qa_review: "QA / Review",
  invoiced: "Invoiced",
  completed: "Completed",
  draft: "Quote Draft",
  sent: "Sent",
  negotiating: "Negotiating",
  revised: "Revised",
  new: "New Enquiry",
  ai_processed: "AI Processed",
  needs_review: "Needs Review",
};

function parseWorkspaceId(routeId: string): ParsedWorkspaceId {
  if (routeId.startsWith("draft-")) {
    return {
      kind: "draft",
      sourceId: routeId.slice("draft-".length),
      operatingId: routeId,
    };
  }

  if (routeId.startsWith("lead-")) {
    return {
      kind: "lead",
      sourceId: routeId.slice("lead-".length),
      operatingId: routeId,
    };
  }

  if (routeId.startsWith("quote-")) {
    return {
      kind: "quote",
      sourceId: routeId.slice("quote-".length),
      operatingId: routeId,
    };
  }

  if (routeId.startsWith("project-")) {
    return {
      kind: "project",
      sourceId: routeId.slice("project-".length),
      operatingId: routeId,
    };
  }

  return {
    kind: "project",
    sourceId: routeId,
    operatingId: `project-${routeId}`,
  };
}

function first<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

function list<T>(value: T | T[] | null | undefined): T[] {
  if (Array.isArray(value)) return value;
  return value ? [value] : [];
}

function text(value?: string | null, fallback = "-"): string {
  const trimmed = value?.trim();
  return trimmed ? trimmed : fallback;
}

function stageLabel(status: string): string {
  return defaultStageLabels[status] ?? text(status, "Unknown");
}

function propertyLabel(property?: AnyRecord | null): string {
  if (!property) return "Property not set";

  return (
    [
      property.property_name,
      property.address_line_1,
      property.unit_no,
      property.postal_code,
    ]
      .filter(Boolean)
      .join(", ") || "Property not set"
  );
}

function extractionPropertyLabel(extraction: ReturnType<typeof parseLeadExtraction>): string {
  return (
    [
      extraction.propertyName,
      extraction.addressLine1 || extraction.address,
      extraction.unitNumber,
      extraction.postalCode,
    ]
      .filter(Boolean)
      .join(", ") || "Property not set"
  );
}

function priorityLabel(value?: string | null): string {
  if (!value) return "Normal";
  if (value === "medium") return "Normal";

  return value
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function messageBody(message: AnyRecord): string {
  return text(
    message.body_text ??
      message.message_text ??
      message.content ??
      message.media_caption,
    "No message text",
  );
}

function messageDirection(message: AnyRecord): "inbound" | "outbound" {
  return message.direction === "outbound" || message.direction_code === "outbound"
    ? "outbound"
    : "inbound";
}

function normalizeMessages(messages: AnyRecord[]): ProjectWorkspaceMessage[] {
  return messages.map((message, index) => ({
    id: text(message.id, `message-${index}`),
    direction: messageDirection(message),
    author:
      text(message.sender_name, "") ||
      (messageDirection(message) === "outbound" ? "Team" : "Customer"),
    body: messageBody(message),
    at: message.sent_at ?? message.created_at ?? null,
  }));
}

function normalizeRawConversation(
  rawConversation: Parameters<typeof parseConversationMessages>[0],
): ProjectWorkspaceMessage[] {
  return parseConversationMessages(rawConversation).map((message, index) => ({
    id: `raw-message-${index}`,
    direction: message.direction,
    author:
      text(message.senderName, "") ||
      (message.direction === "outbound" ? "Team" : "Customer"),
    body: message.text,
    at: message.sentAt ?? null,
  }));
}

function normalizeProjectWorkItem(item: AnyRecord): ProjectWorkspaceWorkItem {
  return {
    id: text(item.id, item.title ?? "work-item"),
    title: text(item.title, "Untitled work item"),
    description: text(
      item.description ?? item.action_summary ?? item.area_name,
      "No description recorded",
    ),
    status: text(item.status_code, "pending"),
    priority: text(item.priority_code, "normal"),
    assignedTo: text(first<AnyRecord>(item.assigned_profile)?.display_name, "Unassigned"),
    quotedAmount: typeof item.quoted_amount === "number" ? item.quoted_amount : null,
    actualCost: typeof item.actual_cost === "number" ? item.actual_cost : null,
    scheduledAt: item.scheduled_due_at ?? item.scheduled_start_at ?? null,
    completedAt: item.completed_at ?? null,
    note: item.is_deferred ? text(item.deferred_reason, "Deferred") : null,
    mediaCount: list<AnyRecord>(item.media_assets).length,
  };
}

function normalizeQuoteItem(item: AnyRecord): ProjectWorkspaceWorkItem {
  return {
    id: text(item.id, item.title ?? "quote-item"),
    title: text(item.title, "Untitled quote item"),
    description: text(item.description ?? item.notes, "No description recorded"),
    status: text(item.status_code, item.source_project_item_id ? "approved" : "draft"),
    priority: text(item.priority_code, "normal"),
    assignedTo: "Unassigned",
    quotedAmount:
      typeof item.total_price === "number"
        ? item.total_price
        : typeof item.quoted_amount === "number"
          ? item.quoted_amount
          : null,
    actualCost: null,
    scheduledAt: null,
    completedAt: null,
    note: null,
    mediaCount: 0,
  };
}

function normalizeExtractedWorkItems(
  workItems: ReturnType<typeof parseLeadExtraction>["workItems"],
): ProjectWorkspaceWorkItem[] {
  return workItems.map((item, index) => ({
    id: `extracted-work-item-${index}`,
    title: text(item.title, `Work item ${index + 1}`),
    description: text(
      item.description ?? item.actionSummary ?? item.areaName,
      "Needs review",
    ),
    status: "needs_review",
    priority: item.priority ?? "normal",
    assignedTo: "Unassigned",
    quotedAmount: null,
    actualCost: null,
    scheduledAt: null,
    completedAt: null,
    note: item.isAddOn
      ? "Add-on"
      : item.isPi
        ? "PI"
        : item.isChecklistItem
          ? "Checklist"
          : null,
    mediaCount: item.mediaAssets?.length ?? 0,
  }));
}

function photosFromMedia(mediaAssets: AnyRecord[]): ProjectWorkspacePhoto[] {
  return mediaAssets.map((asset, index) => ({
    id: text(asset.id, `photo-${index}`),
    url: asset.signed_url ?? asset.signedUrl ?? null,
    caption: text(asset.caption ?? asset.file_name ?? asset.fileName, "Project photo"),
    type: text(asset.evidence_type ?? asset.media_type ?? asset.mediaType, "Photo"),
  }));
}

function photosFromExtractedWorkItems(
  workItems: ReturnType<typeof parseLeadExtraction>["workItems"],
): ProjectWorkspacePhoto[] {
  return workItems.flatMap((item, itemIndex) =>
    (item.mediaAssets ?? []).map((asset, assetIndex) => ({
      id: text(asset.id, `draft-photo-${itemIndex}-${assetIndex}`),
      url: asset.signedUrl ?? null,
      caption: text(asset.caption ?? asset.fileName, item.title || "Project photo"),
      type: text(asset.mediaType, "Photo"),
    })),
  );
}

function findOperatingItem(
  boardItems: ProjectOperatingItem[],
  parsed: ParsedWorkspaceId,
): ProjectOperatingItem | null {
  return (
    boardItems.find((item) => item.id === parsed.operatingId) ??
    boardItems.find((item) => item.href === `/projects/${parsed.sourceId}`) ??
    null
  );
}

function projectPaymentTotals(project: AnyRecord) {
  const invoices = list<AnyRecord>(project.invoices);
  const payments = list<AnyRecord>(project.payments);
  const invoiceTotal = invoices.reduce(
    (sum, invoice) =>
      sum + (typeof invoice.total_amount === "number" ? invoice.total_amount : 0),
    0,
  );
  const paidTotal = payments.reduce(
    (sum, payment) => sum + (typeof payment.amount === "number" ? payment.amount : 0),
    0,
  );

  return {
    invoiceTotal,
    paidTotal,
    outstanding: Math.max(invoiceTotal - paidTotal, 0),
    invoiceNumber: text(invoices[0]?.invoice_number, ""),
  };
}

function statusFromBoard(
  boardItem: ProjectOperatingItem | null,
  fallback: string,
): {
  stage: string;
  stageLabel: string;
} {
  return {
    stage: boardItem?.stage ?? fallback,
    stageLabel: boardItem?.stageLabel ?? stageLabel(fallback),
  };
}

function lifecycleStageFromLead(lead: AnyRecord): ProjectLifecycleStage {
  if (lead.status_code === "site_visit" || lead.site_visit_required) return "site_visit";
  if (lead.status_code === "new_enquiry") return "new_enquiry";
  return "qualification";
}

function lifecycleStageFromQuote(statusCode: string): ProjectLifecycleStage {
  return ["sent", "negotiating", "revised"].includes(statusCode)
    ? "awaiting_approval"
    : "quote_draft";
}

function buildBaseFromBoard(
  routeId: string,
  parsed: ParsedWorkspaceId,
  boardItem: ProjectOperatingItem | null,
): Pick<
  ProjectWorkspace,
  | "routeId"
  | "kind"
  | "sourceId"
  | "title"
  | "customerName"
  | "propertyLabel"
  | "stage"
  | "stageLabel"
  | "priority"
  | "assignedTeam"
  | "health"
  | "nextAction"
  | "scheduledDate"
  | "paymentStatus"
  | "quoteValue"
> {
  return {
    routeId,
    kind: parsed.kind,
    sourceId: parsed.sourceId,
    title: boardItem?.title ?? "Customer job",
    customerName: boardItem?.customerName ?? "Customer not set",
    propertyLabel: boardItem?.propertyLabel ?? "Property not set",
    stage: boardItem?.stage ?? "scheduled",
    stageLabel: boardItem?.stageLabel ?? "Scheduled",
    priority: boardItem?.priority ?? "Normal",
    assignedTeam: boardItem?.assignedTeam ?? ["Unassigned"],
    health: boardItem?.health ?? "Needs Action",
    nextAction: boardItem?.nextAction ?? "Review project",
    scheduledDate: boardItem?.scheduledDate ?? null,
    paymentStatus: boardItem?.paymentStatus ?? "Not invoiced",
    quoteValue: boardItem?.quoteValue ?? null,
  };
}

function sortedTimeline(
  events: ProjectWorkspaceTimelineEvent[],
): ProjectWorkspaceTimelineEvent[] {
  return events.filter((event) => event.at);
}

async function buildProjectWorkspace(
  routeId: string,
  parsed: ParsedWorkspaceId,
  boardItem: ProjectOperatingItem | null,
): Promise<ProjectWorkspace | null> {
  const project = await getProjectDetail(parsed.sourceId);
  if (!project) return null;

  const record = project as AnyRecord;
  const base = buildBaseFromBoard(routeId, parsed, boardItem);
  const contact = first<AnyRecord>(record.contacts);
  const property = first<AnyRecord>(record.properties);
  const coordinator = first<AnyRecord>(record.coordinator);
  const workItems = list<AnyRecord>(record.project_items).map(normalizeProjectWorkItem);
  const mediaAssets = photosFromMedia(list<AnyRecord>(record.media_assets));
  const thread = record.inbox_preview?.thread ?? null;
  const messages = normalizeMessages(list<AnyRecord>(record.inbox_preview?.messages));
  const reviewDraft = record.inbox_preview?.review_draft ?? null;
  const finance = projectPaymentTotals(record);
  const workItemQuoteValue = workItems.reduce(
    (sum, item) => sum + (item.quotedAmount ?? 0),
    0,
  );
  const quoteValue = base.quoteValue ?? (workItemQuoteValue > 0 ? workItemQuoteValue : null);
  const team = base.assignedTeam.length > 0 ? base.assignedTeam : [
    text(coordinator?.display_name, "Unassigned"),
  ];

  return {
    ...base,
    title: text(record.title, base.title),
    customerName: text(contact?.full_name, base.customerName),
    propertyLabel: propertyLabel(property),
    assignedTeam: team,
    quoteValue,
    overview: {
      summary: text(
        record.scope_summary ?? record.remarks,
        "No project summary has been written yet.",
      ),
      decision: base.nextAction,
      latestActivity: text(
        messages.at(-1)?.body ?? boardItem?.latestActivity,
        "No recent activity recorded.",
      ),
      source: text(record.source_channel_code, "Project"),
    },
    conversation: {
      threadId: thread?.id ?? null,
      messages,
    },
    workItems,
    quote: {
      id: null,
      status: null,
      version: null,
      total: quoteValue,
      items: workItems,
    },
    schedule: {
      startAt: record.scheduled_start_at ?? null,
      endAt: record.scheduled_end_at ?? null,
      handoverAt: record.handover_at ?? null,
      preferredDate: null,
      preferredWindow: null,
      team,
    },
    photos: mediaAssets,
    finance: {
      quoteValue,
      invoiceTotal: finance.invoiceTotal,
      paidTotal: finance.paidTotal,
      outstanding: finance.outstanding,
      paymentStatus: base.paymentStatus,
      invoiceNumber: finance.invoiceNumber || null,
    },
    timeline: sortedTimeline([
      { label: "Customer enquiry", at: record.enquiry_at ?? null },
      { label: "Project created", at: record.created_at ?? null },
      { label: "Scheduled", at: record.scheduled_start_at ?? null },
      { label: "Handover", at: record.handover_at ?? null },
      ...list<AnyRecord>(record.invoices).map((invoice) => ({
        label: `Invoice ${text(invoice.invoice_number, "created")}`,
        at: invoice.issued_at ?? invoice.created_at ?? null,
      })),
      ...list<AnyRecord>(record.payments).map((payment) => ({
        label: `Payment ${text(payment.status_code, "recorded")}`,
        at: payment.verified_at ?? payment.reported_at ?? payment.created_at ?? null,
      })),
      { label: "Last updated", at: record.updated_at ?? null },
    ]),
    actions: {
      reviewDraftId: reviewDraft?.id ?? null,
      leadId: record.source_lead_id ?? null,
      leadStatus: null,
      latestQuoteId: null,
      quoteId: null,
      quoteStatus: null,
      quoteProjectId: null,
      threadId: thread?.id ?? null,
    },
  };
}

async function buildLeadWorkspace(
  routeId: string,
  parsed: ParsedWorkspaceId,
  boardItem: ProjectOperatingItem | null,
): Promise<ProjectWorkspace | null> {
  const lead = await getLeadDetail(parsed.sourceId);
  if (!lead) return null;

  const record = lead as AnyRecord;
  const thread = first<AnyRecord>(record.whatsapp_threads);
  const [quotes, latestDraft, threadMessages] = await Promise.all([
    listQuotesByLeadId(parsed.sourceId),
    getLatestReviewDraftByLeadId(parsed.sourceId),
    thread?.id ? listMessagesByThreadId(thread.id) : Promise.resolve([]),
  ]);
  const latestQuote = quotes[0] ?? null;
  const latestQuoteDetail = latestQuote ? ((await getQuoteDetail(latestQuote.id)) as AnyRecord | null) : null;
  const quoteItems = list<AnyRecord>(latestQuoteDetail?.quote_items).map(normalizeQuoteItem);
  const extraction = latestDraft ? parseLeadExtraction(latestDraft.extraction_payload) : null;
  const extractedItems = extraction ? normalizeExtractedWorkItems(extraction.workItems) : [];
  const rawMessages = latestDraft ? normalizeRawConversation(latestDraft.raw_conversation) : [];
  const contact = first<AnyRecord>(record.contacts);
  const property = first<AnyRecord>(record.properties);
  const assignedProfile = first<AnyRecord>(record.assigned_profile);
  const stage = statusFromBoard(boardItem, lifecycleStageFromLead(record));
  const base = buildBaseFromBoard(routeId, parsed, boardItem);
  const messages = normalizeMessages(threadMessages as AnyRecord[]);
  const workItems = quoteItems.length > 0 ? quoteItems : extractedItems;
  const quoteTotal =
    typeof latestQuote?.total_amount === "number"
      ? latestQuote.total_amount
      : boardItem?.quoteValue ?? null;

  return {
    ...base,
    stage: stage.stage,
    stageLabel: stage.stageLabel,
    title: text(record.title, base.title),
    customerName: text(contact?.full_name, base.customerName),
    propertyLabel: propertyLabel(property),
    priority: record.site_visit_required ? "High" : base.priority,
    assignedTeam: [text(assignedProfile?.display_name, "Unassigned")],
    scheduledDate: null,
    paymentStatus: "Not invoiced",
    quoteValue: quoteTotal,
    overview: {
      summary: text(
        record.ai_summary ?? record.summary ?? record.customer_request,
        "This job is still being qualified.",
      ),
      decision: record.site_visit_required
        ? "Schedule inspection"
        : latestQuote
          ? "Review quote progress"
          : "Confirm scope and create quote",
      latestActivity: text(
        boardItem?.latestActivity ?? record.qualification_notes,
        "Lead is being qualified.",
      ),
      source: text(record.source_channel_code, "Qualification"),
    },
    conversation: {
      threadId: thread?.id ?? null,
      messages: messages.length > 0 ? messages : rawMessages,
    },
    workItems,
    quote: {
      id: latestQuote?.id ?? null,
      status: latestQuote?.status_code ?? null,
      version: latestQuote?.version_number ?? null,
      total: quoteTotal,
      items: quoteItems,
    },
    schedule: {
      startAt: null,
      endAt: null,
      handoverAt: null,
      preferredDate: extraction?.preferredDate ?? null,
      preferredWindow: extraction?.preferredTimeWindow ?? null,
      team: [text(assignedProfile?.display_name, "Unassigned")],
    },
    photos: extraction ? photosFromExtractedWorkItems(extraction.workItems) : [],
    finance: {
      quoteValue: quoteTotal,
      invoiceTotal: 0,
      paidTotal: 0,
      outstanding: 0,
      paymentStatus: "Not invoiced",
      invoiceNumber: null,
    },
    timeline: sortedTimeline([
      { label: "Customer enquiry", at: record.received_at ?? record.created_at ?? null },
      { label: "Lead updated", at: record.updated_at ?? null },
      { label: "Latest intake review", at: latestDraft?.updated_at ?? null },
      { label: "Latest quote", at: latestQuote?.updated_at ?? null },
    ]),
    actions: {
      reviewDraftId: latestDraft?.id ?? null,
      leadId: record.id,
      leadStatus: record.status_code ?? null,
      latestQuoteId: latestQuote?.id ?? null,
      quoteId: null,
      quoteStatus: null,
      quoteProjectId: null,
      threadId: thread?.id ?? null,
    },
  };
}

async function buildQuoteWorkspace(
  routeId: string,
  parsed: ParsedWorkspaceId,
  boardItem: ProjectOperatingItem | null,
): Promise<ProjectWorkspace | null> {
  const quote = (await getQuoteDetail(parsed.sourceId)) as AnyRecord | null;
  if (!quote) return null;

  const lead = quote.lead_id ? ((await getLeadDetail(quote.lead_id)) as AnyRecord | null) : null;
  const thread = first<AnyRecord>(lead?.whatsapp_threads);
  const threadMessages = thread?.id ? await listMessagesByThreadId(thread.id) : [];
  const contact = first<AnyRecord>(lead?.contacts);
  const property = first<AnyRecord>(lead?.properties);
  const quoteItems = list<AnyRecord>(quote.quote_items).map(normalizeQuoteItem);
  const stage = statusFromBoard(boardItem, lifecycleStageFromQuote(quote.status_code));
  const base = buildBaseFromBoard(routeId, parsed, boardItem);
  const quoteTotal =
    typeof quote.total_amount === "number" ? quote.total_amount : boardItem?.quoteValue ?? null;

  return {
    ...base,
    stage: stage.stage,
    stageLabel: stage.stageLabel,
    title: text(lead?.title, base.title),
    customerName: text(contact?.full_name, base.customerName),
    propertyLabel: propertyLabel(property),
    priority: stage.stage === "awaiting_approval" ? "High" : base.priority,
    assignedTeam: ["Admin"],
    scheduledDate: null,
    paymentStatus: "Not invoiced",
    quoteValue: quoteTotal,
    overview: {
      summary: text(
        lead?.customer_request ?? lead?.summary ?? lead?.ai_summary,
        "Quote is being prepared or awaiting approval.",
      ),
      decision:
        stage.stage === "awaiting_approval"
          ? "Follow up with customer"
          : "Review and send quote",
      latestActivity: text(boardItem?.latestActivity, "Quote needs review."),
      source: "Quote",
    },
    conversation: {
      threadId: thread?.id ?? null,
      messages: normalizeMessages(threadMessages as AnyRecord[]),
    },
    workItems: quoteItems,
    quote: {
      id: quote.id,
      status: quote.status_code ?? null,
      version: quote.version_number ?? null,
      total: quoteTotal,
      items: quoteItems,
    },
    schedule: {
      startAt: null,
      endAt: null,
      handoverAt: null,
      preferredDate: null,
      preferredWindow: null,
      team: ["Unassigned"],
    },
    photos: [],
    finance: {
      quoteValue: quoteTotal,
      invoiceTotal: 0,
      paidTotal: 0,
      outstanding: 0,
      paymentStatus: "Not invoiced",
      invoiceNumber: null,
    },
    timeline: sortedTimeline([
      { label: "Quote created", at: quote.created_at ?? null },
      { label: "Quote sent", at: quote.sent_at ?? null },
      { label: "Quote approved", at: quote.approved_at ?? null },
      { label: "Quote updated", at: quote.updated_at ?? null },
    ]),
    actions: {
      reviewDraftId: null,
      leadId: quote.lead_id ?? null,
      leadStatus: lead?.status_code ?? null,
      latestQuoteId: quote.id,
      quoteId: quote.id,
      quoteStatus: quote.status_code ?? null,
      quoteProjectId: quote.project_id ?? null,
      threadId: thread?.id ?? null,
    },
  };
}

async function buildDraftWorkspace(
  routeId: string,
  parsed: ParsedWorkspaceId,
  boardItem: ProjectOperatingItem | null,
): Promise<ProjectWorkspace | null> {
  const draft = (await getReviewDraftById(parsed.sourceId)) as AnyRecord | null;
  if (!draft) return null;

  const extraction = parseLeadExtraction(draft.extraction_payload);
  const threadMessages = draft.thread_id ? await listMessagesByThreadId(draft.thread_id) : [];
  const messages = normalizeMessages(threadMessages as AnyRecord[]);
  const rawMessages = normalizeRawConversation(draft.raw_conversation);
  const workItems = normalizeExtractedWorkItems(extraction.workItems);
  const status = statusFromBoard(boardItem, draft.status ?? "new_enquiry");
  const base = buildBaseFromBoard(routeId, parsed, boardItem);

  return {
    ...base,
    stage: status.stage,
    stageLabel: status.stageLabel,
    title: text(
      extraction.projectTitle ?? extraction.leadTitle ?? extraction.issue,
      base.title,
    ),
    customerName: text(extraction.customerName, base.customerName),
    propertyLabel: extractionPropertyLabel(extraction),
    priority: priorityLabel(extraction.urgency),
    assignedTeam: ["Unassigned"],
    scheduledDate: null,
    paymentStatus: "Not quoted",
    quoteValue: null,
    overview: {
      summary: text(
        extraction.scopeSummary ?? extraction.summary ?? extraction.issue,
        "Customer enquiry needs review.",
      ),
      decision: "Review intake and confirm scope",
      latestActivity: text(draft.review_notes, "Intake waiting for review."),
      source: text(draft.source_channel_code, "Inbox intake"),
    },
    conversation: {
      threadId: draft.thread_id ?? null,
      messages: messages.length > 0 ? messages : rawMessages,
    },
    workItems,
    quote: {
      id: null,
      status: null,
      version: null,
      total: null,
      items: [],
    },
    schedule: {
      startAt: null,
      endAt: null,
      handoverAt: null,
      preferredDate: extraction.preferredDate ?? null,
      preferredWindow: extraction.preferredTimeWindow ?? null,
      team: ["Unassigned"],
    },
    photos: photosFromExtractedWorkItems(extraction.workItems),
    finance: {
      quoteValue: null,
      invoiceTotal: 0,
      paidTotal: 0,
      outstanding: 0,
      paymentStatus: "Not quoted",
      invoiceNumber: null,
    },
    timeline: sortedTimeline([
      { label: "Customer enquiry", at: draft.created_at ?? null },
      { label: "AI extraction updated", at: draft.updated_at ?? null },
    ]),
    actions: {
      reviewDraftId: draft.id,
      leadId: draft.lead_id ?? null,
      leadStatus: null,
      latestQuoteId: null,
      quoteId: null,
      quoteStatus: null,
      quoteProjectId: null,
      threadId: draft.thread_id ?? null,
    },
  };
}

export async function getProjectWorkspace(
  routeId: string,
): Promise<ProjectWorkspace | null> {
  const parsed = parseWorkspaceId(routeId);
  const boardItems = await getProjectOperatingBoard();
  const boardItem = findOperatingItem(boardItems, parsed);

  if (parsed.kind === "draft") {
    return buildDraftWorkspace(routeId, parsed, boardItem);
  }

  if (parsed.kind === "lead") {
    return buildLeadWorkspace(routeId, parsed, boardItem);
  }

  if (parsed.kind === "quote") {
    return buildQuoteWorkspace(routeId, parsed, boardItem);
  }

  return buildProjectWorkspace(routeId, parsed, boardItem);
}
