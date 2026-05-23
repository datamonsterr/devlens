"use client";

import { useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";

export function useRole() {
  const { user, isLoaded: isUserLoaded } = useUser();
  const [contextRole, setContextRole] = useState(null);
  const [isContextLoaded, setIsContextLoaded] = useState(false);

  useEffect(() => {
    if (!isUserLoaded || !user) {
      setContextRole(null);
      setIsContextLoaded(isUserLoaded);
      return;
    }

    let cancelled = false;
    setIsContextLoaded(false);
    fetch("/api/team")
      .then((res) => res.ok ? res.json() : null)
      .then((data) => {
        if (!cancelled) setContextRole(data?.context?.role || null);
      })
      .catch(() => {
        if (!cancelled) setContextRole(null);
      })
      .finally(() => {
        if (!cancelled) setIsContextLoaded(true);
      });

    return () => { cancelled = true; };
  }, [isUserLoaded, user]);

  const role = contextRole || (isUserLoaded ? (user?.publicMetadata?.role || null) : null);
  const isLoaded = isUserLoaded && isContextLoaded;
  return { role, isManager: role === "manager", isDeveloper: role === "developer", isLoaded };
}
