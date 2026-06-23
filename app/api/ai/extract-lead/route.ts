import { NextResponse } from "next/server";
import { extractLeadFromConversation } from "@/backend/services/ai/extract-lead-from-conversation";
import type { AiLeadExtractionRequest } from "@/types/integration";

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as AiLeadExtractionRequest;

    if (!Array.isArray(payload.messages) || payload.messages.length === 0) {
      return NextResponse.json(
        { error: "messages must be a non-empty array" },
        { status: 400 },
      );
    }

    const result = await extractLeadFromConversation(payload);

    return NextResponse.json({
      success: true,
      simulated: result.simulated,
      model: result.model,
      extraction: result.extraction,
      rawText: result.rawText,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to extract lead",
      },
      { status: 500 },
    );
  }
}
