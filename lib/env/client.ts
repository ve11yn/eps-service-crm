function getPublicEnv(
  value: string | undefined,
  keyName: "NEXT_PUBLIC_SUPABASE_URL" | "NEXT_PUBLIC_SUPABASE_ANON_KEY",
): string {
  if (!value) {
    throw new Error(
      `Missing required public environment variable: ${keyName}`,
    );
  }

  return value;
}

export const clientEnv = {
  supabaseUrl: getPublicEnv(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    "NEXT_PUBLIC_SUPABASE_URL",
  ),
  supabaseAnonKey: getPublicEnv(
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  ),
};
