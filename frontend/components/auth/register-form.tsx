"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type RegisterRole = {
  code: "coordinator" | "field_worker";
  label: string;
  description: string | null;
};

export function RegisterForm() {
  const router = useRouter();
  const [roles, setRoles] = useState<RegisterRole[]>([]);
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [roleCode, setRoleCode] = useState<RegisterRole["code"]>("field_worker");
  const [status, setStatus] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingRoles, setIsLoadingRoles] = useState(true);

  useEffect(() => {
    async function loadRoles() {
      try {
        const response = await fetch("/api/auth/register-roles");
        const payload = (await response.json()) as {
          success?: boolean;
          roles?: RegisterRole[];
        };

        if (response.ok && payload.success && payload.roles?.length) {
          setRoles(payload.roles);
          setRoleCode(payload.roles[0].code);
        }
      } finally {
        setIsLoadingRoles(false);
      }
    }

    void loadRoles();
  }, []);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setStatus(null);

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          displayName,
          email,
          username,
          password,
          roleCode,
        }),
      });

      const payload = (await response.json()) as {
        success?: boolean;
        error?: string;
      };

      if (!response.ok || !payload.success) {
        throw new Error(payload.error ?? "Failed to register account.");
      }

      router.push("/login");
      router.refresh();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Failed to register account.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isLoadingRoles) {
    return <p className="auth-form-message">Loading account options...</p>;
  }

  return (
    <form className="auth-form" onSubmit={handleSubmit}>
      <label className="field-block">
        <span className="field-label">Full Name</span>
        <input
          className="input"
          placeholder="Your full name"
          value={displayName}
          onChange={(event) => setDisplayName(event.target.value)}
          required
        />
      </label>

      <label className="field-block">
        <span className="field-label">Email Address</span>
        <input
          className="input"
          type="email"
          autoComplete="email"
          placeholder="name@company.com"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
        />
      </label>

      <label className="field-block">
        <span className="field-label">Username</span>
        <input
          className="input"
          autoComplete="username"
          placeholder="Choose a username"
          value={username}
          onChange={(event) => setUsername(event.target.value)}
          required
        />
      </label>

      <label className="field-block">
        <span className="field-label">Role</span>
        <select
          className="input input-select"
          value={roleCode}
          onChange={(event) =>
            setRoleCode(event.target.value as RegisterRole["code"])
          }
        >
          {roles.map((role) => (
            <option key={role.code} value={role.code}>
              {role.label}
            </option>
          ))}
        </select>
      </label>

      <label className="field-block">
        <span className="field-label">Password</span>
        <input
          className="input"
          type="password"
          autoComplete="new-password"
          placeholder="At least 8 characters"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
          minLength={8}
        />
      </label>

      <button type="submit" className="button button-primary" disabled={isSubmitting}>
        {isSubmitting ? "Creating account..." : "Create account"}
      </button>

      {status ? <p className="auth-form-message" role="alert">{status}</p> : null}
    </form>
  );
}
