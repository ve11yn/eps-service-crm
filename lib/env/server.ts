import "server-only";

type RequiredEnvKey =
  | "NEXT_PUBLIC_SUPABASE_URL"
  | "NEXT_PUBLIC_SUPABASE_ANON_KEY"
  | "SUPABASE_SERVICE_ROLE_KEY";

const requiredKeys: RequiredEnvKey[] = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
];

function getEnv(key: RequiredEnvKey): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

function getOptionalEnv(key: string): string | null {
  return process.env[key] ?? null;
}

function getOptionalEnvFromKeys(keys: string[]): string | null {
  for (const key of keys) {
    const value = process.env[key];
    if (value) {
      return value;
    }
  }

  return null;
}

void requiredKeys;

export const serverEnv = {
  supabaseUrl: getEnv("NEXT_PUBLIC_SUPABASE_URL"),
  supabaseAnonKey: getEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
  supabaseServiceRoleKey: getEnv("SUPABASE_SERVICE_ROLE_KEY"),
  whatsappApiBaseUrl: getOptionalEnv("WHATSAPP_API_BASE_URL"),
  whatsappApiKey: getOptionalEnv("WHATSAPP_API_KEY"),
  whatsappGraphApiBaseUrl:
    getOptionalEnv("WHATSAPP_GRAPH_API_BASE_URL") ??
    "https://graph.facebook.com",
  whatsappApiVersion:
    getOptionalEnv("WHATSAPP_API_VERSION") ?? "v25.0",
  whatsappAccessToken: getOptionalEnv("WHATSAPP_ACCESS_TOKEN"),
  whatsappPhoneNumberId: getOptionalEnv("WHATSAPP_PHONE_NUMBER_ID"),
  whatsappBusinessAccountId: getOptionalEnv(
    "WHATSAPP_BUSINESS_ACCOUNT_ID",
  ),
  whatsappWebhookVerifyToken: getOptionalEnv("WHATSAPP_WEBHOOK_VERIFY_TOKEN"),
  whatsappWebhookSignatureSecret: getOptionalEnv(
    "WHATSAPP_WEBHOOK_SIGNATURE_SECRET",
  ),
  metaAppId: getOptionalEnvFromKeys(["META_APP_ID", "NEXT_PUBLIC_META_APP_ID"]),
  metaAppSecret: getOptionalEnv("META_APP_SECRET"),
  whatsappEmbeddedSignupConfigId: getOptionalEnv(
    "NEXT_PUBLIC_WHATSAPP_EMBEDDED_SIGNUP_CONFIG_ID",
  ),
  whatsappTokenEncryptionKey: getOptionalEnv(
    "WHATSAPP_TOKEN_ENCRYPTION_KEY",
  ),
  claudeApiKey: getOptionalEnvFromKeys(["ANTHROPIC_API_KEY", "AI_API_KEY"]),
  claudeModel: getOptionalEnvFromKeys(["CLAUDE_MODEL", "AI_MODEL"]),
  alertWebhookUrl: getOptionalEnv("ALERT_WEBHOOK_URL"),
  quickbooksClientId: getOptionalEnv("QUICKBOOKS_CLIENT_ID"),
  quickbooksClientSecret: getOptionalEnv("QUICKBOOKS_CLIENT_SECRET"),
  quickbooksRefreshToken: getOptionalEnv("QUICKBOOKS_REFRESH_TOKEN"),
  quickbooksRealmId: getOptionalEnv("QUICKBOOKS_REALM_ID"),
  quickbooksServiceItemId: getOptionalEnv("QUICKBOOKS_SERVICE_ITEM_ID"),
  quickbooksEnvironment: getOptionalEnv("QUICKBOOKS_ENVIRONMENT") ?? "sandbox",
};
