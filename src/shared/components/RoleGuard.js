"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useRole } from "@/shared/hooks/useRole";

/**
 * Client-side route guard that redirects users without the required role.
 * Wrap any page component with this to enforce role-based page access.
 *
 * @param {Object} props
 * @param {string[]} props.allowed - Array of allowed role strings (e.g. ["manager"])
 * @param {React.ReactNode} props.children - Page content to render if authorized
 * @param {React.ReactNode} [props.fallback] - Optional loading fallback while checking role
 */
export default function RoleGuard({ allowed = [], children, fallback }) {
  const { role, isLoaded } = useRole();
  const router = useRouter();

  useEffect(() => {
    if (isLoaded && role && !allowed.includes(role)) {
      router.replace("/dashboard");
    }
  }, [isLoaded, role, allowed, router]);

  if (!isLoaded) return fallback || null;
  if (!role || !allowed.includes(role)) return null;
  return children;
}
