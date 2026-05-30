import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isProtectedRoute = createRouteMatcher([
  "/dashboard(.*)",
  "/api/((?!v1|v1beta|auth/oidc|auth/status|health|init|locale|version).*)",
]);

const isPublicRoute = createRouteMatcher([
  "/",
  "/landing(.*)",
  "/onboarding(.*)",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/api/v1(.*)",
  "/api/v1beta(.*)",
  "/api/health",
  "/api/init",
  "/api/locale",
  "/api/version",
  "/api/auth/status",
  "/api/auth/oidc(.*)",
]);

export default clerkMiddleware(async (auth, req) => {
  if (isProtectedRoute(req) && !isPublicRoute(req)) {
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
