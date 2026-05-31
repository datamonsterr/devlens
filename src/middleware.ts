import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const isPublicRoute = createRouteMatcher([
  "/",
  "/landing(.*)",
  "/login(.*)",
  "/onboarding(.*)",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/manifest.webmanifest",
  "/icons(.*)",
  "/i18n(.*)",
  "/favicon.svg",
  "/api/v1(.*)",
  "/api/v1beta(.*)",
  "/api/health",
  "/api/init",
  "/api/locale",
  "/api/version",
  "/api/auth/login",
  "/api/auth/logout",
  "/api/auth/status",
  "/api/auth/oidc(.*)",
]);

function base64UrlToBytes(value: string) {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  const binary = atob(base64);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

async function hasDashboardSession(req: Request) {
  const token = req.headers.get("cookie")?.match(/(?:^|; )auth_token=([^;]+)/)?.[1];
  // Note: Edge runtime cannot load the file-based fallback secret (fs/path unavailable).
  // Always set JWT_SECRET in environment variables for dashboard auth to work.
  const secret = process.env.JWT_SECRET || "devlens-local-dev-secret";
  if (!token) return false;
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return false;
    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"]
    );
    const verified = await crypto.subtle.verify(
      "HMAC",
      key,
      base64UrlToBytes(parts[2]),
      new TextEncoder().encode(`${parts[0]}.${parts[1]}`)
    );
    if (!verified) return false;
    const payload = JSON.parse(new TextDecoder().decode(base64UrlToBytes(parts[1])));
    return payload.authenticated === true && (!payload.exp || payload.exp * 1000 > Date.now());
  } catch {
    return false;
  }
}

export default clerkMiddleware(async (auth, req) => {
  if (isPublicRoute(req)) return;
  const { userId: clerkUserId } = await auth();
  const hasSession = await hasDashboardSession(req);
  const cookieNames = (req.headers.get("cookie") || "").split(";").map(c => c.trim().split("=")[0]).filter(Boolean);
  console.log(`[AUTH] ${req.method} ${req.nextUrl.pathname} | clerkUserId=${clerkUserId || "none"} | auth_token=${hasSession} | cookies=[${cookieNames.join(",")}]`);
  if (!clerkUserId && !hasSession) {
    if (req.nextUrl.pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    await auth.protect();
  }
});

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|webmanifest|json)$).*)",
    "/",
    "/(api|trpc)(.*)",
    "/__clerk/(.*)",
  ],
};
