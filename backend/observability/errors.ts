import "server-only";

import { NextResponse } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { serverEnv } from "@/lib/env/server";
import type { Json } from "@/types/database";

type SystemErrorLogInsert = {
  scope: string;
  severity: "info" | "warning" | "error" | "critical";
  error_name: string;
  message: string;
  stack: string | null;
  details: Json | null;
};

type SystemErrorLogTableClient = {
  from(table: "system_error_logs"): {
    insert(values: SystemErrorLogInsert): Promise<unknown>;
  };
};

function toErrorPayload(error: unknown) {
  if (error instanceof Error) {
    return {
      message: error.message,
      stack: error.stack ?? null,
      name: error.name,
    };
  }

  return {
    message: "Unknown error",
    stack: null,
    name: "UnknownError",
  };
}

export async function logSystemError(input: {
  scope: string;
  error: unknown;
  severity?: "info" | "warning" | "error" | "critical";
  details?: Json;
}) {
  const errorPayload = toErrorPayload(input.error);

  console.error(`[${input.scope}]`, input.error);

  try {
    const supabase =
      createAdminSupabaseClient() as unknown as SystemErrorLogTableClient;

    await supabase.from("system_error_logs").insert({
      scope: input.scope,
      severity: input.severity ?? "error",
      error_name: errorPayload.name,
      message: errorPayload.message,
      stack: errorPayload.stack,
      details: input.details ?? null,
    });
  } catch (loggingError) {
    console.error("Failed to persist system error log", loggingError);
  }

  if (serverEnv.alertWebhookUrl && (input.severity ?? "error") !== "info") {
    try {
      await fetch(serverEnv.alertWebhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: `[${input.severity ?? "error"}] ${input.scope}: ${errorPayload.message}`,
          scope: input.scope,
          severity: input.severity ?? "error",
          details: input.details ?? null,
        }),
      });
    } catch (alertError) {
      console.error("Failed to send alert webhook", alertError);
    }
  }
}

export async function routeErrorResponse(input: {
  scope: string;
  error: unknown;
  details?: Json;
  status?: number;
}) {
  await logSystemError({
    scope: input.scope,
    error: input.error,
    details: input.details,
    severity: (input.status ?? 500) >= 500 ? "error" : "warning",
  });

  return NextResponse.json(
    {
      success: false,
      error:
        input.error instanceof Error
          ? input.error.message
          : "Unexpected error",
    },
    { status: input.status ?? 500 },
  );
}
