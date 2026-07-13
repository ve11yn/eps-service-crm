import Link from "next/link";
import Image from "next/image";
import { RegisterForm } from "@/frontend/components/auth/register-form";

export default function RegisterPage() {
  return (
    <main className="auth-shell">
      <div className="auth-layout auth-layout-register">
        <section className="auth-intro" aria-label="Account information">
          <Image className="auth-logo" src="/eps-logo.png" alt="Gage Handyman and Cleaning Service" width={72} height={72} priority />
          <div>
            <p className="auth-kicker">Team access</p>
            <h1>Join the operations team.</h1>
            <p>Create a coordinator or field-worker account. Access will automatically match the selected role.</p>
          </div>
          <p className="auth-intro-note">Administrators can update staff access later from Configuration.</p>
        </section>

        <section className="auth-card auth-card-register">
          <header className="auth-card-header">
            <p className="auth-kicker">New account</p>
            <h2>Create your staff account</h2>
            <p>Enter the details you will use to access the system.</p>
          </header>
          <RegisterForm />
          <p className="auth-switch-link">
            Already registered? <Link href="/login">Return to sign in</Link>
          </p>
        </section>
      </div>
    </main>
  );
}
