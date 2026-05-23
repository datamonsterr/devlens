import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isProtectedRoute = createRouteMatcher([
  "/dashboard(.*)",
  "/api/((?!v1|v1beta|auth/oidc|auth/login|auth/logout|auth/status|health|init|locale|version).*)",
]);

const isPublicRoute = createRouteMatcher([
  "/",
  "/landing(.*)",
  "/login(.*)",
  "/onboarding(.*)",
  "/sign-in(.*)",
  "/sign-up(.*)",
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
  const secret = process.env.JWT_SECRET;
  if (!token || !secret) return false;
  try {
    const [encodedHeader, encodedPayload, encodedSignature] = decodeURIComponent(token).split(".");
    if (!encodedHeader || !encodedPayload || !encodedSignature) return false;
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
      base64UrlToBytes(encodedSignature),
      new TextEncoder().encode(`${encodedHeader}.${encodedPayload}`)
    );
    if (!verified) return false;
    const payload = JSON.parse(new TextDecoder().decode(base64UrlToBytes(encodedPayload)));
    return payload.authenticated === true && (!payload.exp || payload.exp * 1000 > Date.now());
  } catch {
    return false;
  }
}

export default clerkMiddleware(async (auth, req) => {
  if (isProtectedRoute(req) && !isPublicRoute(req) && !(await hasDashboardSession(req))) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
    "/",
    "/(api|trpc)(.*)",
    "/__clerk/(.*)",
  ],
};
