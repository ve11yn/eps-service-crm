"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export function RegisterOwnerForm() {
  const router = useRouter();
  const [allowRegistration, setAllowRegistration] = useState<boolean | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    async function loadSetupStatus() {
      try {
        const response = await fetch("/api/auth/setup-status");
        const payload = (await response.json()) as {
          success?: boolean;
          allowOwnerRegistration?: boolean;
        };

        setAllowRegistration(Boolean(payload.success && payload.allowOwnerRegistration));
      } catch {
        setAllowRegistration(false);
      }
    }

    void loadSetupStatus();
  }, []);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setStatus(null);

    try {
      const response = await fetch("/api/auth/register-owner", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          displayName,
          username,
          phone,
          password,
        }),
      });

      const payload = (await response.json()) as {
        success?: boolean;
        error?: string;
      };

      if (!response.ok || !payload.success) {
        throw new Error(payload.error ?? "Failed to register owner.");
      }

      router.push("/login");
      router.refresh();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Failed to register owner.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (allowRegistration === null) {
    return <p className="helper-text">Checking setup status...</p>;
  }

  if (!allowRegistration) {
    return (
      <p className="helper-text">
        Owner registration is already completed. Use an existing account to log in.
      </p>
    );
  }

  return (
    <form className="page-stack" onSubmit={handleSubmit}>
      <label className="field-block">
        <span className="field-label">Display Name</span>
        <input
          className="input"
          value={displayName}
          onChange={(event) => setDisplayName(event.target.value)}
          required
        />
      </label>

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
        <span className="field-label">Phone</span>
        <input
          className="input"
          value={phone}
          onChange={(event) => setPhone(event.target.value)}
        />
      </label>

      <label className="field-block">
        <span className="field-label">Password</span>
        <input
          className="input"
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
          minLength={8}
        />
      </label>

      <button type="submit" className="button button-primary" disabled={isSubmitting}>
        {isSubmitting ? "Creating owner..." : "Create Owner Account"}
      </button>

      {status ? <p className="helper-text">{status}</p> : null}
    </form>
  );
}
