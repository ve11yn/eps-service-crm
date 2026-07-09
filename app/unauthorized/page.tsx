import Link from "next/link";

export default function UnauthorizedPage() {
  return (
    <main className="auth-shell">
      <section className="auth-card">
        <div className="page-stack">
          <div>
            <h1>Unauthorized</h1>
          </div>

          <Link href="/login" className="button button-primary">
            Back to Login
          </Link>
        </div>
      </section>
    </main>
  );
}
