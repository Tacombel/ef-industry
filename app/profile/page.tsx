"use client";

import { useState } from "react";
import Link from "next/link";
import { useSession } from "@/hooks/useSession";
import { useConnection } from "@evefrontier/dapp-kit";

export default function ProfilePage() {
  const { user } = useSession();
  const { walletAddress } = useConnection();

  const [syncLoading, setSyncLoading] = useState(false);
  const [syncMsg, setSyncMsg] = useState<{ ok: boolean; text: string } | null>(null);

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

  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess(false);

    if (next !== confirm) {
      setError("New passwords do not match");
      return;
    }
    if (next.length < 6) {
      setError("New password must be at least 6 characters");
      return;
    }

    setLoading(true);
    const res = await fetch("/api/auth/password", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword: current, newPassword: next }),
    });
    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error ?? "Error changing password");
      return;
    }

    setSuccess(true);
    setCurrent("");
    setNext("");
    setConfirm("");
  }

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col">
      {/* Header */}
      <div className="bg-gray-900 border-b border-gray-800 px-6 py-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-100">Profile</h1>
          <Link href="/dashboard" className="btn-sm btn-secondary">
            ← Back to Dashboard
          </Link>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="max-w-md w-full space-y-6">

      {/* Vault user info */}
      {walletAddress && (
        <div className="rounded-lg border border-gray-800 bg-gray-900 p-6 space-y-3">
          <div>
            <p className="text-xs text-gray-500 mb-1">Character</p>
            <p className="text-sm font-medium text-gray-200">{user?.username}</p>
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
      )}

      <div className="rounded-lg border border-gray-800 bg-gray-900 p-6">
        <p className="text-sm text-gray-400 mb-4">
          Logged in as <span className="font-medium text-gray-200">{user?.username}</span>
          {user?.role === "ADMIN" && (
            <span className="ml-2 text-xs text-cyan-500">ADMIN</span>
          )}
        </p>

        <h2 className="text-base font-semibold text-gray-100 mb-4">Change password</h2>

        {error && (
          <div className="mb-4 rounded border border-red-800 bg-red-900/20 px-4 py-3 text-sm text-red-400">
            {error}
          </div>
        )}
        {success && (
          <div className="mb-4 rounded border border-green-800 bg-green-900/20 px-4 py-3 text-sm text-green-400">
            Password changed successfully.
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Current password</label>
            <input
              type="password"
              value={current}
              onChange={(e) => setCurrent(e.target.value)}
              required
              className="input w-full"
              autoComplete="current-password"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">New password</label>
            <input
              type="password"
              value={next}
              onChange={(e) => setNext(e.target.value)}
              required
              minLength={6}
              className="input w-full"
              autoComplete="new-password"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Confirm new password</label>
            <input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
              minLength={6}
              className="input w-full"
              autoComplete="new-password"
            />
          </div>
          <button type="submit" disabled={loading} className="btn-sm btn-primary disabled:opacity-50">
            {loading ? "Saving…" : "Change password"}
          </button>
        </form>
      </div>
        </div>
      </div>
    </div>
  );
}
