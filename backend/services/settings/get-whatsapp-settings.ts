import "server-only";

import { getActiveWhatsAppConnectionRow } from "@/backend/repositories/whatsapp-connections-repository";
import { serverEnv } from "@/lib/env/server";

export async function getWhatsAppSettings() {
  let connection: Awaited<
    ReturnType<typeof getActiveWhatsAppConnectionRow>
  > = null;
  let connectionError: string | null = null;

  if (serverEnv.whatsappTokenEncryptionKey) {
    try {
      connection = await getActiveWhatsAppConnectionRow();
    } catch (error) {
      connectionError =
        error instanceof Error ? error.message : "Could not load connection";
    }
  }

  return {
    embeddedSignupConfigured: Boolean(
      serverEnv.metaAppId &&
        serverEnv.metaAppSecret &&
        serverEnv.whatsappEmbeddedSignupConfigId &&
        serverEnv.whatsappTokenEncryptionKey,
    ),
    manualCloudApiConfigured: Boolean(
      serverEnv.whatsappAccessToken && serverEnv.whatsappPhoneNumberId,
    ),
    webhookConfigured: Boolean(serverEnv.whatsappWebhookVerifyToken),
    signatureVerificationConfigured: Boolean(
      serverEnv.whatsappWebhookSignatureSecret || serverEnv.metaAppSecret,
    ),
    connectionError,
    connection: connection
      ? {
          status: connection.status,
          onboardingType: connection.onboarding_type,
          displayPhoneNumber: connection.display_phone_number,
          verifiedName: connection.verified_name,
          subscribedAt: connection.subscribed_at,
          registeredAt: connection.registered_at,
          historySyncRequestedAt: connection.history_sync_requested_at,
          lastError: connection.last_error,
        }
      : null,
  };
}
