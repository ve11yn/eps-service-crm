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

void requiredKeys;

export const serverEnv = {
  supabaseUrl: getEnv("NEXT_PUBLIC_SUPABASE_URL"),
  supabaseAnonKey: getEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
  supabaseServiceRoleKey: getEnv("SUPABASE_SERVICE_ROLE_KEY"),
  whatsappApiBaseUrl: getOptionalEnv("WHATSAPP_API_BASE_URL"),
  whatsappApiKey: getOptionalEnv("WHATSAPP_API_KEY"),
  whatsappWebhookVerifyToken: getOptionalEnv("WHATSAPP_WEBHOOK_VERIFY_TOKEN"),
  whatsappWebhookSignatureSecret: getOptionalEnv(
    "WHATSAPP_WEBHOOK_SIGNATURE_SECRET",
  ),
  claudeApiKey: getOptionalEnv("ANTHROPIC_API_KEY"),
  claudeModel: getOptionalEnv("CLAUDE_MODEL"),
};
