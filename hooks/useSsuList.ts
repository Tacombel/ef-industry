"use client";

import { useState, useEffect } from "react";

export interface SsuSummary {
  address: string;
  name: string;
  displayName: string;
  typeId: number;
  status: string;
}

export function useSsuList() {
  const [ssus, setSsus] = useState<SsuSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    fetch("/api/ssu-list")
      .then((r) => r.json())
      .then((d) => { if (d.ssus) setSsus(d.ssus); })
      .catch(() => setError("No se pudieron cargar los SSUs"))
      .finally(() => setLoading(false));
  }, []);

  return { ssus, loading, error };
}
