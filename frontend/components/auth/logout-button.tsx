"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { LucideIcon } from "lucide-react";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

export function LogoutButton({ icon: Icon }: { icon: LucideIcon }) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleLogout() {
    setIsSubmitting(true);

    try {
      const supabase = createBrowserSupabaseClient();
      await supabase.auth.signOut();
      router.push("/login");
      router.refresh();
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <button
      type="button"
      className="dashboard-nav-link"
      onClick={handleLogout}
      disabled={isSubmitting}
    >
      <Icon className="dashboard-nav-icon" aria-hidden="true" size={18} strokeWidth={2} />
      <span>{isSubmitting ? "Signing Out..." : "Logout"}</span>
    </button>
  );
}
