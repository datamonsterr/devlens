export async function sendDeveloperOnboardingEmail({ email, teamName, inviteUrl }) {
  if (!process.env.ONBOARDING_EMAIL_WEBHOOK_URL) {
    return { status: "skipped" };
  }

  const response = await fetch(process.env.ONBOARDING_EMAIL_WEBHOOK_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      to: email,
      subject: `Join ${teamName} on Devlens`,
      teamName,
      inviteUrl,
      message: `You have been invited to join ${teamName} on Devlens. Accept the invitation to access your Team and assigned API Key.`,
    }),
  });

  if (!response.ok) {
    throw new Error("Onboarding email failed");
  }

  return { status: "sent" };
}
