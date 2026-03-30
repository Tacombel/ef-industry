"use client";

import { useState, useEffect } from "react";
import { useConnection } from "@evefrontier/dapp-kit";
import { getWalletCharacters } from "@evefrontier/dapp-kit/graphql";

interface Props {
  redirectTo?: string;
  compact?: boolean;
}

export default function VaultLoginButton({ redirectTo = "/dashboard", compact = false }: Props) {
  const { isConnected, hasEveVault, walletAddress, handleConnect } = useConnection();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingAuth, setPendingAuth] = useState(false);

  // After wallet connects (from a pending auth attempt), automatically proceed with sign-in
  useEffect(() => {
    if (pendingAuth && isConnected && walletAddress) {
      setPendingAuth(false);
      doAuth(walletAddress);
    }
  }, [pendingAuth, isConnected, walletAddress]);

  async function doAuth(address: string) {
    try {
      const nonceRes = await fetch("/api/auth/nonce");
      if (!nonceRes.ok) throw new Error("Failed to get nonce");
      const { nonce } = await nonceRes.json();

      let characterName: string | undefined;
      try {
        const characters = await getWalletCharacters(address);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        characterName = (characters as any)?.[0]?.name ?? undefined;
      } catch {
        // Not critical — fall back to wallet address as display name
      }

      const authRes = await fetch("/api/auth/wallet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ walletAddress: address, characterName, nonce }),
      });

      if (!authRes.ok) {
        const data = await authRes.json();
        throw new Error(data.error ?? "Authentication failed");
      }

      // Clear wallet auto-connect keys — the server session handles auth from here on,
      // so we don't want the vault PIN dialog on subsequent page loads.
      localStorage.removeItem("eve-dapp-connected");
      localStorage.removeItem("mysten-dapp-kit:selected-wallet-and-address");
      window.location.href = redirectTo;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  async function handleVaultLogin() {
    setError(null);
    setLoading(true);
    try {
      if (!isConnected) {
        setPendingAuth(true);
        await handleConnect();
        // doAuth will be triggered by the useEffect once isConnected + walletAddress are ready
        return;
      }

      if (!walletAddress) {
        setError("No wallet account selected");
        setLoading(false);
        return;
      }

      await doAuth(walletAddress);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setLoading(false);
    }
  }

  if (!hasEveVault) {
    if (compact) {
      return (
        <a
          href="https://evefrontier.com"
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-cyan-400 hover:underline px-2 py-1"
        >
          Get EVE Vault
        </a>
      );
    }
    return (
      <div className="text-center space-y-2">
        <p className="text-gray-400 text-sm">EVE Vault extension not detected.</p>
        <a
          href="https://evefrontier.com"
          target="_blank"
          rel="noopener noreferrer"
          className="text-cyan-400 text-xs hover:underline"
        >
          Get EVE Vault →
        </a>
      </div>
    );
  }

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <button
          onClick={handleVaultLogin}
          disabled={loading}
          className="px-3 py-2 text-sm font-medium bg-cyan-700 hover:bg-cyan-600 disabled:opacity-50 text-white rounded transition-colors"
        >
          {loading ? "..." : "EVE Vault"}
        </button>
        {error && <span className="text-red-400 text-xs">{error}</span>}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <button
        onClick={handleVaultLogin}
        disabled={loading}
        className="w-full bg-cyan-700 hover:bg-cyan-600 disabled:opacity-50 text-white font-medium py-2.5 rounded text-sm transition-colors flex items-center justify-center gap-2"
      >
        {loading ? "..." : "Login with EVE Vault"}
      </button>

      {error && <p className="text-red-400 text-xs text-center">{error}</p>}
    </div>
  );
}
