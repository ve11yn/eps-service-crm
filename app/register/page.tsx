import Link from "next/link";
import { RegisterForm } from "@/frontend/components/auth/register-form";

export default function RegisterPage() {
  return (
    <main className="auth-shell">
      <section className="auth-card">
        <div className="page-stack">
          <div>
            <p className="eyebrow">Team Registration</p>
            <h1>Create Account</h1>
            <p className="page-header-copy">
              Register with your company role, email address, username, and password.
            </p>
          </div>

          <RegisterForm />

          <p className="helper-text">
            Already have an account? <Link href="/login">Go to login</Link>.
          </p>
        </div>
      </section>
    </main>
  );
}
