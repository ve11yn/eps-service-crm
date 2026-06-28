import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { routeErrorResponse } from "@/backend/observability/errors";
import { extractLeadFromConversation } from "@/backend/services/ai/extract-lead-from-conversation";
import { requireApiSession } from "@/lib/auth/api";
import type { AiLeadExtractionRequest } from "@/types/integration";

async function readMockConversation(): Promise<AiLeadExtractionRequest> {
  const filePath = path.join(
    process.cwd(),
    "backend",
    "integrations",
    "ai",
    "mock-whatsapp-conversation.json",
  );
  const raw = await readFile(filePath, "utf8");

  return JSON.parse(raw) as AiLeadExtractionRequest;
}

export async function GET() {
  const auth = await requireApiSession(["owner", "admin"]);

  if (!auth.ok) {
    return auth.response;
  }

  const payload = await readMockConversation();

  return NextResponse.json({
    success: true,
    payload,
  });
}

export async function POST() {
  const auth = await requireApiSession(["owner", "admin"]);

  if (!auth.ok) {
    return auth.response;
  }

  try {
    const payload = await readMockConversation();
    const result = await extractLeadFromConversation(payload);

    return NextResponse.json({
      success: true,
      simulated: result.simulated,
      model: result.model,
      payload,
      extraction: result.extraction,
      rawText: result.rawText,
    });
  } catch (error) {
    return routeErrorResponse({
      scope: "api.dev.mock-whatsapp",
      error,
      details: { performedByProfileId: auth.session.profile.id },
    });
  }
}
