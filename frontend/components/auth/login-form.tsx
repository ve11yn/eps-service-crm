"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

export function LoginForm({
  nextPath = "/",
}: {
  nextPath?: string;
}) {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setStatus(null);

    try {
      const loginLookupResponse = await fetch("/api/auth/login-lookup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username,
        }),
      });

      const loginLookupPayload = (await loginLookupResponse.json()) as {
        success?: boolean;
        email?: string;
        error?: string;
      };

      if (
        !loginLookupResponse.ok ||
        !loginLookupPayload.success ||
        !loginLookupPayload.email
      ) {
        throw new Error(loginLookupPayload.error ?? "Invalid username or password.");
      }

      const supabase = createBrowserSupabaseClient();
      const { data, error } = await supabase.auth.signInWithPassword({
        email: loginLookupPayload.email,
        password,
      });

      if (error) {
        throw error;
      }

      let destination = nextPath;

      if (nextPath === "/") {
        const payloadRoleCode = data.session?.user.user_metadata?.role_code as
          | string
          | undefined;

        if (payloadRoleCode === "owner" || payloadRoleCode === "admin") {
          destination = "/";
        } else {
          destination = "/worker";
        }
      }

      router.push(destination);
      router.refresh();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Failed to sign in.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="page-stack" onSubmit={handleSubmit}>
      <label className="field-block">
        <span className="field-label">Username</span>
        <input
          className="input"
          autoComplete="username"
          value={username}
          onChange={(event) => setUsername(event.target.value)}
          required
        />
      </label>

      <label className="field-block">
        <span className="field-label">Password</span>
        <input
          className="input"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
        />
      </label>

      <button type="submit" className="button button-primary" disabled={isSubmitting}>
        {isSubmitting ? "Signing in..." : "Login"}
      </button>

      {status ? <p className="helper-text">{status}</p> : null}
    </form>
  );
}
