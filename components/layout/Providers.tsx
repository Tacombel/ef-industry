"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import dynamic from "next/dynamic";
import { useState } from "react";

// EveFrontierProvider accesses `window` at module level — must be loaded client-only
const EveFrontierProviderNoSSR = dynamic(
  () => import("@evefrontier/dapp-kit").then((m) => ({ default: m.EveFrontierProvider })),
  { ssr: false }
);

export default function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      <EveFrontierProviderNoSSR queryClient={queryClient}>
        {children}
      </EveFrontierProviderNoSSR>
    </QueryClientProvider>
  );
}
