import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSettings } from "@/lib/localDb";
import { getDashboardAuthSession } from "@/lib/auth/dashboardSession";

export async function GET() {
  const settings = await getSettings();
  const cookieStore = await cookies();
  const session = await getDashboardAuthSession(cookieStore.get("auth_token")?.value);
  const oidcConfigured = !!(settings.oidcIssuerUrl && settings.oidcClientId && settings.oidcClientSecret);

  return NextResponse.json({
    authenticated: !!session?.authenticated,
    requireLogin: settings.requireLogin !== false,
    hasPassword: !!settings.password,
    authMode: settings.authMode || "password",
    oidcConfigured,
    oidcLoginLabel: settings.oidcLoginLabel || "Sign in with OIDC",
  });
}
