import { SignIn } from "@clerk/nextjs";

export default function DeveloperOnboardingPage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-bg p-6">
      <div className="w-full max-w-md space-y-4">
        <div className="text-center">
          <h1 className="text-3xl font-semibold text-text-main">Join team</h1>
          <p className="text-text-muted">Use your manager&apos;s Clerk Organization invitation.</p>
        </div>
        <SignIn routing="hash" afterSignInUrl="/dashboard" />
      </div>
    </main>
  );
}
