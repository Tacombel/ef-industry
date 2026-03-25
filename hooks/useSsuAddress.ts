"use client";

import { useState, useEffect } from "react";

const SESSION_KEY = "ssuAddress";

export function useSsuAddress() {
  const [address, setAddressState] = useState("");
  const [loggedIn, setLoggedIn] = useState(false);

  useEffect(() => {
    // Load from sessionStorage immediately
    const stored = sessionStorage.getItem(SESSION_KEY) ?? "";
    if (stored) setAddressState(stored);

    // Then check DB (only works if logged in)
    fetch("/api/auth/ssu")
      .then((r) => r.json())
      .then((d) => {
        setLoggedIn(true);
        if (d.ssuAddress) {
          setAddressState(d.ssuAddress);
          sessionStorage.setItem(SESSION_KEY, d.ssuAddress);
        }
      })
      .catch(() => setLoggedIn(false));
  }, []);

  function saveAddress(addr: string) {
    const trimmed = addr.trim();
    setAddressState(trimmed);
    if (trimmed) sessionStorage.setItem(SESSION_KEY, trimmed);
    else sessionStorage.removeItem(SESSION_KEY);

    if (loggedIn) {
      fetch("/api/auth/ssu", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ssuAddress: trimmed }),
      });
    }
  }

  return { address, saveAddress };
}
