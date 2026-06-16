import { createClient } from "@supabase/supabase-js";
import { clientEnv } from "@/lib/env/client";
import type { Database } from "@/types/database";

export function createBrowserSupabaseClient() {
  return createClient<Database>(
    clientEnv.supabaseUrl,
    clientEnv.supabaseAnonKey,
  );
}
