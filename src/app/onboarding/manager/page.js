import { SignUp } from "@clerk/nextjs";

export default function ManagerOnboardingPage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-bg p-6">
      <div className="w-full max-w-md space-y-4">
        <div className="text-center">
          <h1 className="text-3xl font-semibold text-text-main">Create team</h1>
          <p className="text-text-muted">Team managers create the Clerk Organization for Devlens.</p>
        </div>
        <SignUp unsafeMetadata={{ role: "manager" }} afterSignUpUrl="/dashboard" />
      </div>
    </main>
  );
}
