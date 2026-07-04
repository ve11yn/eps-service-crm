import { NextRequest, NextResponse } from "next/server";
import { routeErrorResponse } from "@/backend/observability/errors";
import { normalizeWhatsAppInboundPayloads } from "@/backend/integrations/whatsapp/normalizers";
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
  try {
    const rawBody = await request.text();
    const signatureHeader = request.headers.get("x-hub-signature-256");

    if (!verifyWhatsAppWebhookSignature(rawBody, signatureHeader)) {
      return NextResponse.json(
        { error: "Invalid webhook signature" },
        { status: 401 },
      );
    }

    const payload = JSON.parse(rawBody) as WhatsAppRawInboundPayload;
    const normalizedMessages = normalizeWhatsAppInboundPayloads(payload);

    if (normalizedMessages.length === 0) {
      return NextResponse.json({
        success: true,
        processed: 0,
        skipped: "No inbound messages in payload",
      });
    }

    const processed = [];

    for (const normalizedMessage of normalizedMessages) {
      const result = await ingestWhatsAppEvent(normalizedMessage);

      let reviewDraftId: string | null = null;
      let reviewDraftError: string | null = null;

      try {
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

        reviewDraftId = reviewDraftResult.reviewDraft.id;
      } catch (error) {
        reviewDraftError =
          error instanceof Error
            ? error.message
            : "Failed to create review draft.";
      }

      processed.push({
        wasDuplicate: result.wasDuplicate,
        contactId: result.contact.id,
        threadId: result.thread.id,
        leadId: result.lead.id,
        messageId: result.message.id,
        reviewDraftId,
        reviewDraftError,
      });
    }

    return NextResponse.json({
      success: true,
      processed: processed.length,
      results: processed,
    });
  } catch (error) {
    return routeErrorResponse({
      scope: "api.webhooks.whatsapp",
      error,
      details: {
        source: "whatsapp_webhook",
      },
      status: 500,
    });
  }
}
