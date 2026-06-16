type RequiredPublicEnvKey =
  | "NEXT_PUBLIC_SUPABASE_URL"
  | "NEXT_PUBLIC_SUPABASE_ANON_KEY";

const requiredPublicKeys: RequiredPublicEnvKey[] = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
];

function getPublicEnv(key: RequiredPublicEnvKey): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required public environment variable: ${key}`);
  }
  return value;
}

void requiredPublicKeys;

export const clientEnv = {
  supabaseUrl: getPublicEnv("NEXT_PUBLIC_SUPABASE_URL"),
  supabaseAnonKey: getPublicEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
};
