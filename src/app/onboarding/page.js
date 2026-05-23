import Link from "next/link";

export default function OnboardingPage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-bg p-6">
      <div className="w-full max-w-3xl space-y-8 text-center">
        <div>
          <h1 className="text-4xl font-semibold text-text-main">You&apos;re with Devlens</h1>
          <p className="mt-3 text-text-muted">Choose how you join your team.</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <Link href="/onboarding/manager" className="rounded-2xl border border-border bg-surface p-8 text-left hover:border-primary">
            <span className="material-symbols-outlined text-primary">admin_panel_settings</span>
            <h2 className="mt-4 text-xl font-semibold">Team manager</h2>
            <p className="mt-2 text-sm text-text-muted">Create the Clerk Organization and configure team AI access.</p>
          </Link>
          <Link href="/onboarding/developer" className="rounded-2xl border border-border bg-surface p-8 text-left hover:border-primary">
            <span className="material-symbols-outlined text-primary">person</span>
            <h2 className="mt-4 text-xl font-semibold">Team member</h2>
            <p className="mt-2 text-sm text-text-muted">Join an existing organization from your manager&apos;s invitation.</p>
          </Link>
        </div>
      </div>
    </main>
  );
}
