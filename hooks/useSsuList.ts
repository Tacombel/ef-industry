"use client";

import { useState, useEffect } from "react";

export interface SsuSummary {
  address: string;
  name: string;
  displayName: string;
  typeId: number;
  status: string;
}

export function useSsuList(guestCharacterId?: string) {
  const [ssus, setSsus] = useState<SsuSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    const url = guestCharacterId
      ? `/api/guest/ssus?characterId=${encodeURIComponent(guestCharacterId)}`
      : "/api/ssu-list";
    fetch(url)
      .then((r) => r.json())
      .then((d) => {
        if (!d.ssus) return;
        if (guestCharacterId) {
          setSsus(d.ssus.map((s: { address: string; name: string; typeId: number; status: string }) => ({
            address: s.address,
            name: s.name,
            displayName: s.name || s.address.slice(0, 10) + "…",
            typeId: s.typeId,
            status: s.status,
          })));
        } else {
          setSsus(d.ssus);
        }
      })
      .catch(() => setError("Could not load SSUs"))
      .finally(() => setLoading(false));
  }, [guestCharacterId]);

  return { ssus, loading, error };
}
