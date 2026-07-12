import "server-only";

import { serverEnv } from "@/lib/env/server";
import type { Json } from "@/types/database";

type GraphErrorPayload = {
  error?: {
    message?: string;
    type?: string;
    code?: number;
    error_subcode?: number;
    fbtrace_id?: string;
  };
};

export type MetaPhoneNumber = {
  id: string;
  display_phone_number?: string;
  verified_name?: string;
  quality_rating?: string;
  platform_type?: string;
  code_verification_status?: string;
  is_on_biz_app?: boolean;
};

export class MetaGraphApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code?: number,
    public readonly subcode?: number,
    public readonly traceId?: string,
  ) {
    super(message);
    this.name = "MetaGraphApiError";
  }
}

function buildGraphUrl(path: string): URL {
  const base = serverEnv.whatsappGraphApiBaseUrl.replace(/\/$/, "");
  const version = serverEnv.whatsappApiVersion.replace(/^\//, "").replace(/\/$/, "");
  return new URL(`${base}/${version}/${path.replace(/^\//, "")}`);
}

async function graphRequest<T>(input: {
  path: string;
  accessToken?: string;
  method?: "GET" | "POST";
  query?: Record<string, string>;
  body?: Record<string, unknown>;
}): Promise<T> {
  const url = buildGraphUrl(input.path);

  for (const [key, value] of Object.entries(input.query ?? {})) {
    url.searchParams.set(key, value);
  }

  const response = await fetch(url, {
    method: input.method ?? "GET",
    headers: {
      ...(input.accessToken
        ? { Authorization: `Bearer ${input.accessToken}` }
        : {}),
      ...(input.body ? { "Content-Type": "application/json" } : {}),
    },
    body: input.body ? JSON.stringify(input.body) : undefined,
    cache: "no-store",
  });
  const payload = (await response.json().catch(() => ({}))) as T &
    GraphErrorPayload;

  if (!response.ok || payload.error) {
    const graphError = payload.error;
    throw new MetaGraphApiError(
      graphError?.message ?? `Meta Graph API request failed (${response.status})`,
      response.status,
      graphError?.code,
      graphError?.error_subcode,
      graphError?.fbtrace_id,
    );
  }

  return payload;
}

export async function exchangeEmbeddedSignupCode(code: string) {
  if (!serverEnv.metaAppId || !serverEnv.metaAppSecret) {
    throw new Error("Missing META_APP_ID or META_APP_SECRET");
  }

  return graphRequest<{ access_token: string; token_type?: string }>({
    path: "oauth/access_token",
    query: {
      client_id: serverEnv.metaAppId,
      client_secret: serverEnv.metaAppSecret,
      code,
    },
  });
}

export async function listWabaPhoneNumbers(
  wabaId: string,
  accessToken: string,
): Promise<MetaPhoneNumber[]> {
  const response = await graphRequest<{ data?: MetaPhoneNumber[] }>({
    path: `${wabaId}/phone_numbers`,
    accessToken,
    query: {
      fields:
        "id,display_phone_number,verified_name,quality_rating,platform_type,code_verification_status,is_on_biz_app",
    },
  });

  return response.data ?? [];
}

export async function subscribeAppToWaba(
  wabaId: string,
  accessToken: string,
) {
  return graphRequest<{ success: boolean }>({
    path: `${wabaId}/subscribed_apps`,
    accessToken,
    method: "POST",
  });
}

export async function registerPhoneNumber(input: {
  phoneNumberId: string;
  accessToken: string;
  pin: string;
}) {
  return graphRequest<{ success: boolean }>({
    path: `${input.phoneNumberId}/register`,
    accessToken: input.accessToken,
    method: "POST",
    body: {
      messaging_product: "whatsapp",
      pin: input.pin,
    },
  });
}

export async function requestBusinessAppSync(input: {
  phoneNumberId: string;
  accessToken: string;
  syncType: "history" | "smb_app_state_sync";
}) {
  return graphRequest<{ messaging_product?: string; request_id?: string }>({
    path: `${input.phoneNumberId}/smb_app_data`,
    accessToken: input.accessToken,
    method: "POST",
    body: {
      messaging_product: "whatsapp",
      sync_type: input.syncType,
    },
  });
}

export async function sendCloudApiMessage(input: {
  phoneNumberId: string;
  accessToken: string;
  body: Record<string, unknown>;
}): Promise<Json> {
  return graphRequest<Json>({
    path: `${input.phoneNumberId}/messages`,
    accessToken: input.accessToken,
    method: "POST",
    body: {
      messaging_product: "whatsapp",
      ...input.body,
    },
  });
}
