"use client";

import { useState, useEffect } from "react";
import type { SsuSummary } from "./useSsuList";

const STORAGE_KEY = "ssuIgnored";

export function useSsuIgnored() {
  const [ignoredSet, setIgnoredSet] = useState<Set<string>>(new Set());

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) setIgnoredSet(new Set(JSON.parse(stored)));
    } catch { /* ignore */ }
  }, []);

  function toggleIgnored(address: string) {
    setIgnoredSet((prev) => {
      const next = new Set(prev);
      if (next.has(address)) next.delete(address);
      else next.add(address);
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify([...next])); } catch { /* ignore */ }
      return next;
    });
  }

  function activeSsuAddresses(ssus: SsuSummary[]): string[] {
    return ssus
      .filter((s) => !ignoredSet.has(s.address))
      .map((s) => s.address);
  }

  return { ignoredSet, toggleIgnored, activeSsuAddresses };
}
