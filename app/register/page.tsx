import Link from "next/link";
import { RegisterForm } from "@/frontend/components/auth/register-form";

export default function RegisterPage() {
  return (
    <main className="auth-shell">
      <section className="auth-card">
        <div className="page-stack">
          <div>
            <h1>Create Account</h1>
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
