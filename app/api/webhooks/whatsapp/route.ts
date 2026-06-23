import { NextRequest, NextResponse } from "next/server";
import { normalizeWhatsAppInboundPayload } from "@/backend/integrations/whatsapp/normalizers";
import {
  verifyWhatsAppWebhookChallenge,
  verifyWhatsAppWebhookSignature,
} from "@/backend/integrations/whatsapp/verify-webhook";
import { ingestWhatsAppEvent } from "@/backend/services/leads/ingest-whatsapp-event";
import { processConversationToDraft } from "@/backend/services/review/process-conversation-to-draft";
import type { WhatsAppRawInboundPayload } from "@/types/integration";

export async function GET(request: NextRequest) {
  const challenge = verifyWhatsAppWebhookChallenge({
    mode: request.nextUrl.searchParams.get("hub.mode"),
    token: request.nextUrl.searchParams.get("hub.verify_token"),
    challenge: request.nextUrl.searchParams.get("hub.challenge"),
  });

  if (!challenge) {
    return NextResponse.json(
      { error: "Webhook verification failed" },
      { status: 403 },
    );
  }

  return new NextResponse(challenge, { status: 200 });
}

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const signatureHeader = request.headers.get("x-hub-signature-256");

  if (!verifyWhatsAppWebhookSignature(rawBody, signatureHeader)) {
    return NextResponse.json(
      { error: "Invalid webhook signature" },
      { status: 401 },
    );
  }

  const payload = JSON.parse(rawBody) as WhatsAppRawInboundPayload;
  const normalizedMessage = normalizeWhatsAppInboundPayload(payload);
  const result = await ingestWhatsAppEvent(normalizedMessage);
  const reviewDraftResult = await processConversationToDraft({
    threadId: result.thread.id,
    leadId: result.lead.id,
    contactId: result.contact.id,
    contactName: result.contact.full_name,
    contactPhone:
      result.contact.whatsapp_number ??
      result.contact.primary_phone ??
      undefined,
  });

  return NextResponse.json({
    success: true,
    wasDuplicate: result.wasDuplicate,
    contactId: result.contact.id,
    threadId: result.thread.id,
    leadId: result.lead.id,
    messageId: result.message.id,
    reviewDraftId: reviewDraftResult.reviewDraft.id,
  });
}
