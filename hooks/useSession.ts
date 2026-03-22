"use client";

import { useEffect, useState } from "react";

export interface SessionUser {
  username: string;
  role: string;
}

export function useSession() {
  const [user, setUser] = useState<SessionUser | null | undefined>(undefined);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((data) => setUser(data ?? null))
      .catch(() => setUser(null));
  }, []);

  return {
    user,
    isLoading: user === undefined,
    isAdmin: user?.role === "ADMIN",
    isLoggedIn: user != null,
  };
}
