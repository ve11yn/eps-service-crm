import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { extractLeadFromConversation } from "@/backend/services/ai/extract-lead-from-conversation";
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
  const payload = await readMockConversation();

  return NextResponse.json({
    success: true,
    payload,
  });
}

export async function POST() {
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
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to run mock route",
      },
      { status: 500 },
    );
  }
}
