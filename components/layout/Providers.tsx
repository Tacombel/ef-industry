"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import dynamic from "next/dynamic";
import { useState, useEffect, Component, ReactNode } from "react";

// Keys used by the wallet libraries for auto-connect persistence
const WALLET_STORAGE_KEYS = [
  "eve-dapp-connected",
  "mysten-dapp-kit:selected-wallet-and-address",
];

function clearWalletAutoConnect() {
  if (typeof window === "undefined") return;
  WALLET_STORAGE_KEYS.forEach((key) => localStorage.removeItem(key));
}

// EveFrontierProvider accesses `window` at module level — must be loaded client-only
const EveFrontierProviderNoSSR = dynamic(
  () => import("@evefrontier/dapp-kit").then((m) => ({ default: m.EveFrontierProvider })),
  { ssr: false }
);

// Catches wallet connection errors (e.g. "Connection request timed out") so they
// don't propagate as unhandled runtime errors and crash the page.
class WalletErrorBoundary extends Component<{ children: ReactNode }, { error: boolean }> {
  state = { error: false };

  static getDerivedStateFromError() {
    return { error: true };
  }

  componentDidCatch(error: Error) {
    clearWalletAutoConnect();
    console.warn("[WalletErrorBoundary] Wallet provider error (suppressed):", error.message);
  }

  render() {
    // If the wallet provider crashed, render children without it
    // (app still works, just without wallet features)
    if (this.state.error) return this.props.children;
    return this.props.children;
  }
}

export default function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  useEffect(() => {
    // If the user already has a server session, clear wallet auto-connect keys
    // so the vault PIN dialog doesn't appear on every page load.
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((data) => {
        if (data?.username) clearWalletAutoConnect();
      })
      .catch(() => {});

    // Suppress "Vault unlock was cancelled or timed out" unhandled rejections.
    // React error boundaries don't catch promise rejections from the chrome
    // extension's injected script, so we handle them here.
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const msg: string = event.reason?.message ?? "";
      if (
        msg.includes("Vault unlock was cancelled") ||
        msg.includes("timed out") ||
        msg.includes("Connection request")
      ) {
        event.preventDefault();
        clearWalletAutoConnect();
      }
    };
    window.addEventListener("unhandledrejection", handleUnhandledRejection);
    return () => window.removeEventListener("unhandledrejection", handleUnhandledRejection);
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <WalletErrorBoundary>
        <EveFrontierProviderNoSSR queryClient={queryClient}>
          {children}
        </EveFrontierProviderNoSSR>
      </WalletErrorBoundary>
    </QueryClientProvider>
  );
}
