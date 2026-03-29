"use client";

import { useState } from "react";
import { useConnection } from "@evefrontier/dapp-kit";

interface Props {
  username?: string | null;
}

export default function WalletSection({ username }: Props) {
  const { walletAddress } = useConnection();
  const [syncLoading, setSyncLoading] = useState(false);
  const [syncMsg, setSyncMsg] = useState<{ ok: boolean; text: string } | null>(null);

  if (!walletAddress) return null;

  async function handleSyncCharacter() {
    setSyncLoading(true);
    setSyncMsg(null);
    const res = await fetch("/api/auth/sync-character", { method: "POST" });
    const data = await res.json();
    setSyncLoading(false);
    if (!res.ok) {
      setSyncMsg({ ok: false, text: data.error ?? "Failed to sync" });
    } else if (data.updated) {
      window.location.reload();
    } else {
      setSyncMsg({ ok: true, text: "Already up to date" });
    }
  }

  return (
    <div className="rounded-lg border border-gray-800 bg-gray-900 p-6 space-y-3">
      <div>
        <p className="text-xs text-gray-500 mb-1">Character</p>
        <p className="text-sm font-medium text-gray-200">{username}</p>
      </div>
      <div>
        <p className="text-xs text-gray-500 mb-1">Wallet</p>
        <p className="text-xs font-mono text-gray-400 break-all">{walletAddress}</p>
      </div>
      {syncMsg && (
        <p className={`text-xs ${syncMsg.ok ? "text-green-400" : "text-red-400"}`}>{syncMsg.text}</p>
      )}
      <button onClick={handleSyncCharacter} disabled={syncLoading} className="btn-sm btn-secondary disabled:opacity-50">
        {syncLoading ? "Syncing…" : "Sync character name"}
      </button>
    </div>
  );
}
