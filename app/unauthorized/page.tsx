import Link from "next/link";

export default function UnauthorizedPage() {
  return (
    <main className="auth-shell">
      <section className="auth-card">
        <div className="page-stack">
          <div>
            <p className="eyebrow">Access Control</p>
            <h1>Unauthorized</h1>
            <p className="page-header-copy">
              Your account is signed in, but it does not have permission to access this part of the dashboard.
            </p>
          </div>

          <Link href="/login" className="button button-primary">
            Back to Login
          </Link>
        </div>
      </section>
    </main>
  );
}
