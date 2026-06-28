import { NextResponse } from "next/server";
import { routeErrorResponse } from "@/backend/observability/errors";
import { extractLeadFromConversation } from "@/backend/services/ai/extract-lead-from-conversation";
import { requireApiSession } from "@/lib/auth/api";
import type { AiLeadExtractionRequest } from "@/types/integration";

export async function POST(request: Request) {
  const auth = await requireApiSession(["owner", "admin"]);

  if (!auth.ok) {
    return auth.response;
  }

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
    return routeErrorResponse({
      scope: "api.ai.extract-lead",
      error,
      details: { performedByProfileId: auth.session.profile.id },
    });
  }
}
