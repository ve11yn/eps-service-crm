import { NextResponse } from "next/server";
import { routeErrorResponse } from "@/backend/observability/errors";
import { sendWhatsAppMessage } from "@/backend/services/messages/send-whatsapp-message";
import { requireApiSession } from "@/lib/auth/api";
import type { SendWhatsAppMessageRequest } from "@/types/api";

export async function POST(request: Request) {
  const auth = await requireApiSession(["owner", "admin"]);

  if (!auth.ok) {
    return auth.response;
  }

  try {
    const payload = (await request.json()) as SendWhatsAppMessageRequest;

    if (!payload.threadId || !payload.text?.trim()) {
      return NextResponse.json(
        { error: "threadId and text are required" },
        { status: 400 },
      );
    }

    const result = await sendWhatsAppMessage({
      threadId: payload.threadId,
      text: payload.text.trim(),
      to: payload.to,
      senderName: auth.session.profile.displayName,
    });

    return NextResponse.json({
      success: true,
      messageId: result.message.id,
      externalMessageId: result.externalMessageId,
    });
  } catch (error) {
    return routeErrorResponse({
      scope: "api.messages.send",
      error,
      details: { performedByProfileId: auth.session.profile.id },
    });
  }
}
