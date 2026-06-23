import "server-only";

import { serverEnv } from "@/lib/env/server";

type ClaudeMessageResponse = {
  id?: string;
  model?: string;
  content?: Array<{
    type?: string;
    text?: string;
  }>;
};

export type ClaudeTextResponse = {
  text: string;
  model: string | null;
};

export function isClaudeConfigured(): boolean {
  return Boolean(serverEnv.claudeApiKey && serverEnv.claudeModel);
}

export async function sendClaudeTextPrompt(input: {
  system: string;
  user: string;
}): Promise<ClaudeTextResponse> {
  if (!serverEnv.claudeApiKey || !serverEnv.claudeModel) {
    throw new Error("Claude API is not configured.");
  }

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": serverEnv.claudeApiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: serverEnv.claudeModel,
      max_tokens: 1200,
      system: input.system,
      messages: [
        {
          role: "user",
          content: input.user,
        },
      ],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Claude API request failed: ${response.status} ${errorText}`);
  }

  const data = (await response.json()) as ClaudeMessageResponse;
  const text = (data.content ?? [])
    .filter((item) => item.type === "text" && typeof item.text === "string")
    .map((item) => item.text ?? "")
    .join("\n")
    .trim();

  if (!text) {
    throw new Error("Claude API returned no text content.");
  }

  return {
    text,
    model: data.model ?? serverEnv.claudeModel,
  };
}
