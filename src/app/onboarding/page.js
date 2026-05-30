"use client";

import { SignInButton, SignUpButton, UserButton, useUser, useClerk } from "@clerk/nextjs";

export default function OnboardingPage() {
  const { isSignedIn, user } = useUser();
  const clerk = useClerk();

  const handleRoleSelection = async (role) => {
    if (!isSignedIn) {
      clerk.openSignUp({ unsafeMetadata: { role } });
      return;
    }
    
    // User is signed in but hasn't picked a role yet (legacy auth to clerk migration case)
    try {
      await user.update({
        unsafeMetadata: { ...user.unsafeMetadata, role }
      });
      // Redirect to specific flow after setting role
      window.location.href = role === "manager" ? '/onboarding/manager' : '/onboarding/developer';
    } catch (e) {
      console.error("Failed to update user role", e);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-bg p-6">
      <div className="w-full max-w-3xl space-y-8 text-center">
        <div className="flex justify-end">
          {!isSignedIn && (
            <div className="flex items-center gap-3">
              <SignInButton>
                <button className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-text-main hover:border-primary">
                  Sign in
                </button>
              </SignInButton>
              <SignUpButton>
                <button className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90">
                  Sign up
                </button>
              </SignUpButton>
            </div>
          )}
          {isSignedIn && (
            <UserButton />
          )}
        </div>
        <div>
          <h1 className="text-4xl font-semibold text-text-main">You&apos;re with Devlens</h1>
          <p className="mt-3 text-text-muted">Choose how you join your Team.</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-border bg-surface p-8 text-left h-full">
            <span className="material-symbols-outlined text-primary">admin_panel_settings</span>
            <h2 className="mt-4 text-xl font-semibold">Team manager</h2>
            <p className="mt-2 text-sm text-text-muted mb-6">Create the Clerk Organization and configure Team AI access.</p>
            <button 
              onClick={() => handleRoleSelection("manager")}
              className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white hover:bg-primary/90 transition-colors"
            >
              Set Role to Manager
            </button>
          </div>
          <div className="rounded-2xl border border-border bg-surface p-8 text-left h-full">
            <span className="material-symbols-outlined text-primary">person</span>
            <h2 className="mt-4 text-xl font-semibold">Team member</h2>
            <p className="mt-2 text-sm text-text-muted mb-6">Join an existing organization from your manager&apos;s invitation.</p>
            <button 
              onClick={() => handleRoleSelection("developer")}
              className="w-full rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-text-main hover:border-primary transition-colors"
            >
              Set Role to Member
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
