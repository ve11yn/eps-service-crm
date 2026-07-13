import Link from "next/link";
import Image from "next/image";
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
      <div className="auth-layout">
        <section className="auth-intro" aria-label="System introduction">
          <Image className="auth-logo" src="/eps-logo.png" alt="Gage Handyman and Cleaning Service" width={72} height={72} priority />
          <div>
            <p className="auth-kicker">Operations workspace</p>
            <h1>Keep every job moving.</h1>
            <p>Enquiries, quotations, schedules, field updates and payments stay connected in one place.</p>
          </div>
          <p className="auth-intro-note">Private workspace for EPS Services.</p>
        </section>

        <section className="auth-card">
          <header className="auth-card-header">
            <h2>Sign in to your account</h2>
            <p>Enter your login details to continue.</p>
          </header>
          <LoginForm nextPath={nextPath} />
          <p className="auth-switch-link">
            New team member? <Link href="/register">Create an account</Link>
          </p>
        </section>
      </div>
    </main>
  );
}
