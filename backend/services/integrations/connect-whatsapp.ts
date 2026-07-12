import "server-only";

import {
  exchangeEmbeddedSignupCode,
  listWabaPhoneNumbers,
  registerPhoneNumber,
  requestBusinessAppSync,
  subscribeAppToWaba,
} from "@/backend/integrations/whatsapp/graph-client";
import { encryptWhatsAppToken } from "@/backend/integrations/whatsapp/token-encryption";
import {
  getActiveWhatsAppConnection,
  saveActiveWhatsAppConnection,
  updateWhatsAppConnection,
} from "@/backend/repositories/whatsapp-connections-repository";
import { logAuditEvent } from "@/backend/observability/audit";

export type WhatsAppOnboardingType = "standard" | "coexistence";

function requireMetaId(value: string, label: string): string {
  const normalized = value.trim();
  if (!/^\d+$/.test(normalized)) {
    throw new Error(`${label} is invalid`);
  }
  return normalized;
}

function requirePin(pin: string | undefined): string {
  const normalized = pin?.trim() ?? "";
  if (!/^\d{6}$/.test(normalized)) {
    throw new Error("A 6-digit two-step verification PIN is required");
  }
  return normalized;
}

async function finishConnection(input: {
  connectionId: string;
  accessToken: string;
  wabaId: string;
  phoneNumberId: string;
  onboardingType: WhatsAppOnboardingType;
  pin?: string;
}) {
  const timestamps: {
    subscribed_at?: string;
    registered_at?: string;
    contacts_sync_requested_at?: string;
    history_sync_requested_at?: string;
  } = {};

  try {
    await subscribeAppToWaba(input.wabaId, input.accessToken);
    timestamps.subscribed_at = new Date().toISOString();

    if (input.onboardingType === "standard") {
      await registerPhoneNumber({
        phoneNumberId: input.phoneNumberId,
        accessToken: input.accessToken,
        pin: requirePin(input.pin),
      });
      timestamps.registered_at = new Date().toISOString();
    } else {
      await requestBusinessAppSync({
        phoneNumberId: input.phoneNumberId,
        accessToken: input.accessToken,
        syncType: "smb_app_state_sync",
      });
      timestamps.contacts_sync_requested_at = new Date().toISOString();

      await requestBusinessAppSync({
        phoneNumberId: input.phoneNumberId,
        accessToken: input.accessToken,
        syncType: "history",
      });
      timestamps.history_sync_requested_at = new Date().toISOString();
    }

    return updateWhatsAppConnection(input.connectionId, {
      ...timestamps,
      status: "connected",
      last_error: null,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "WhatsApp setup failed";
    await updateWhatsAppConnection(input.connectionId, {
      ...timestamps,
      status: "action_required",
      last_error: message,
    });
    throw error;
  }
}

export async function connectWhatsApp(input: {
  code: string;
  wabaId: string;
  phoneNumberId?: string;
  businessId?: string;
  onboardingType: WhatsAppOnboardingType;
  pin?: string;
  performedByProfileId: string;
}) {
  const code = input.code.trim();
  if (!code || code.length > 4096) {
    throw new Error("Embedded Signup authorization code is invalid");
  }

  const wabaId = requireMetaId(input.wabaId, "WhatsApp Business Account ID");
  const requestedPhoneNumberId = input.phoneNumberId
    ? requireMetaId(input.phoneNumberId, "Phone number ID")
    : null;
  const tokenResponse = await exchangeEmbeddedSignupCode(code);
  const phoneNumbers = await listWabaPhoneNumbers(
    wabaId,
    tokenResponse.access_token,
  );
  const phone = requestedPhoneNumberId
    ? phoneNumbers.find((candidate) => candidate.id === requestedPhoneNumberId)
    : phoneNumbers.length === 1
      ? phoneNumbers[0]
      : null;

  if (!phone) {
    throw new Error(
      requestedPhoneNumberId
        ? "The selected phone number does not belong to this WhatsApp Business Account"
        : "Meta returned multiple phone numbers without identifying the selected number",
    );
  }

  const connection = await saveActiveWhatsAppConnection({
    waba_id: wabaId,
    phone_number_id: phone.id,
    business_id: input.businessId?.trim() || null,
    display_phone_number: phone.display_phone_number ?? null,
    verified_name: phone.verified_name ?? null,
    access_token_ciphertext: encryptWhatsAppToken(tokenResponse.access_token),
    status: "pending",
    onboarding_type: input.onboardingType,
    is_active: true,
    last_error: null,
    created_by_profile_id: input.performedByProfileId,
  });

  const completed = await finishConnection({
    connectionId: connection.id,
    accessToken: tokenResponse.access_token,
    wabaId,
    phoneNumberId: phone.id,
    onboardingType: input.onboardingType,
    pin: input.pin,
  });

  await logAuditEvent({
    action: "integrations.whatsapp.connect",
    entityType: "whatsapp_connection",
    entityId: completed.id,
    performedByProfileId: input.performedByProfileId,
    metadata: {
      waba_id: wabaId,
      phone_number_id: phone.id,
      onboarding_type: input.onboardingType,
    },
  });

  return completed;
}

export async function retryWhatsAppConnection(input: {
  pin?: string;
  performedByProfileId: string;
}) {
  const connection = await getActiveWhatsAppConnection();
  if (!connection) throw new Error("No active WhatsApp connection found");

  const completed = await finishConnection({
    connectionId: connection.id,
    accessToken: connection.accessToken,
    wabaId: connection.waba_id,
    phoneNumberId: connection.phone_number_id,
    onboardingType:
      connection.onboarding_type === "coexistence" ? "coexistence" : "standard",
    pin: input.pin,
  });

  await logAuditEvent({
    action: "integrations.whatsapp.retry",
    entityType: "whatsapp_connection",
    entityId: completed.id,
    performedByProfileId: input.performedByProfileId,
  });

  return completed;
}
