import Link from "next/link";
import { LoginForm } from "@/frontend/components/auth/login-form";

type LoginPageProps = {
  searchParams: Promise<{
    next?: string;
  }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const nextPath = typeof params.next === "string" ? params.next : "/";

  return (
    <main className="auth-shell">
      <section className="auth-card">
        <div className="page-stack">
          <div>
            <p className="eyebrow">Gage Operations CRM</p>
            <h1>Login</h1>
            <p className="page-header-copy">
              Sign in with your username and password.
            </p>
          </div>

          <LoginForm nextPath={nextPath} />

          <p className="helper-text">
            Need an account? <Link href="/register">Register here</Link>.
          </p>
        </div>
      </section>
    </main>
  );
}
