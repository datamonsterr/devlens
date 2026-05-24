export function getPublicAppUrl(requestUrl) {
  const configured = process.env.DEVLENS_PUBLIC_URL || process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL;
  const base = configured ? (configured.startsWith("http") ? configured : `https://${configured}`) : new URL(requestUrl).origin;
  return base.replace(/\/$/, "");
}

export function getApiBaseUrl(requestUrl) {
  return `${getPublicAppUrl(requestUrl)}/v1`;
}

export async function sendDeveloperOnboardingEmail({ email, teamName, inviteUrl, apiBaseUrl, signInUrl }) {
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
      signInUrl,
      apiBaseUrl,
      message: `You have been invited to join ${teamName} on Devlens. Sign in at ${signInUrl || inviteUrl} and use ${apiBaseUrl} for /v1/* API requests.`,
    }),
  });

  if (!response.ok) {
    throw new Error("Onboarding email failed");
  }

  return { status: "sent" };
}
