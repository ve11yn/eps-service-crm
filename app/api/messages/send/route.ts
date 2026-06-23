import { NextResponse } from "next/server";
import { sendWhatsAppMessage } from "@/backend/services/messages/send-whatsapp-message";
import type { SendWhatsAppMessageRequest } from "@/types/api";

export async function POST(request: Request) {
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
      senderName: payload.senderName,
    });

    return NextResponse.json({
      success: true,
      messageId: result.message.id,
      externalMessageId: result.externalMessageId,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to send WhatsApp message",
      },
      { status: 500 },
    );
  }
}
