"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

export function WorkerSignOut() {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);

  async function signOut() {
    setIsPending(true);
    try {
      const supabase = createBrowserSupabaseClient();
      await supabase.auth.signOut();
      router.push("/login");
      router.refresh();
    } finally {
      setIsPending(false);
    }
  }

  return (
    <button className="worker-sign-out" type="button" onClick={signOut} disabled={isPending}>
      <LogOut size={17} aria-hidden="true" />
      <span>{isPending ? "Signing out…" : "Sign out"}</span>
    </button>
  );
}
