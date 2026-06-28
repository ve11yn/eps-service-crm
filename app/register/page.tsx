import Link from "next/link";
import { RegisterOwnerForm } from "@/frontend/components/auth/register-owner-form";

export default function RegisterPage() {
  return (
    <main className="auth-shell">
      <section className="auth-card">
        <div className="page-stack">
          <div>
            <p className="eyebrow">Initial Setup</p>
            <h1>Create Owner Account</h1>
            <p className="page-header-copy">
              This page is only for the first owner account. After setup, staff accounts should be created from Settings.
            </p>
          </div>

          <RegisterOwnerForm />

          <p className="helper-text">
            Already set up? <Link href="/login">Go to login</Link>.
          </p>
        </div>
      </section>
    </main>
  );
}
