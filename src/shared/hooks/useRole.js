"use client";

import { useUser } from "@clerk/nextjs";

export function useRole() {
  const { user, isLoaded } = useUser();
  const role = isLoaded ? (user?.publicMetadata?.role || null) : null;
  return { role, isManager: role === "manager", isDeveloper: role === "developer", isLoaded };
}
