import "server-only";

import { createClient } from "@supabase/supabase-js";
import { serverEnv } from "@/lib/env/server";
import type { Database } from "@/types/database";

export function createServerSupabaseClient() {
  return createClient<Database>(
    serverEnv.supabaseUrl,
    serverEnv.supabaseAnonKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );
}
