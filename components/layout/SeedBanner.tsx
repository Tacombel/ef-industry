"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { ImportPreview } from "@/app/api/admin/import/preview/route";

function hasChanges(data: ImportPreview): boolean {
  return (
    data.factories.new.length > 0 ||
    data.locations.new.length > 0 ||
    data.items.new.length > 0 ||
    data.items.updated.length > 0 ||
    data.asteroidTypes.new.length > 0 ||
    data.decompositions.new.length > 0 ||
    data.blueprints.new.length > 0 ||
    data.blueprints.updated.length > 0
  );
}

export default function SeedBanner() {
  const [pending, setPending] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    fetch("/api/admin/import/preview", { method: "POST" })
      .then((r) => r.json())
      .then((data: ImportPreview) => { if (hasChanges(data)) setPending(true); })
      .catch(() => {/* silently ignore */});
  }, []);

  if (!pending || dismissed) return null;

  return (
    <div className="flex items-start gap-3 bg-blue-900/50 border border-blue-700 text-blue-200 text-sm px-4 py-3">
      <span className="text-blue-400 text-base mt-0.5">ℹ</span>
      <div className="flex-1">
        <span className="font-semibold">Data update available</span>
        <div className="mt-1 text-blue-300/80">
          <code className="bg-blue-950/60 px-1 rounded font-mono">seed.json</code> has changes not yet applied to your database.
          Go to{" "}
          <Link href="/admin" className="underline hover:text-blue-100">Admin → Merge import</Link>{" "}
          to apply them.
        </div>
      </div>
      <button
        onClick={() => setDismissed(true)}
        className="text-blue-500 hover:text-blue-200 text-lg leading-none mt-0.5"
        title="Dismiss"
      >
        ×
      </button>
    </div>
  );
}
