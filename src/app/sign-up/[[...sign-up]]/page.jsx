"use client";

import { SignUp } from "@clerk/nextjs";
import { useState } from "react";

export default function SignUpPage() {
  const [orgName, setOrgName] = useState("");

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg p-4">
      <div className="w-full max-w-md space-y-4">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-primary mb-2">Devlens</h1>
          <p className="text-text-muted">Create your team account</p>
        </div>
        <div className="bg-surface rounded-lg p-4">
          <label className="block text-sm font-medium mb-2">Organization Name</label>
          <input
            type="text"
            className="w-full p-2 rounded bg-bg border border-border text-text"
            placeholder="Your team name"
            value={orgName}
            onChange={(e) => setOrgName(e.target.value)}
            required
          />
        </div>
        <SignUp
          unsafeMetadata={{ orgName }}
          afterSignUpUrl="/dashboard"
        />
      </div>
    </div>
  );
}
