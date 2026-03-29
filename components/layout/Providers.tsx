"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { EveFrontierProvider } from "@evefrontier/dapp-kit";
import { useState } from "react";

export default function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      <EveFrontierProvider queryClient={queryClient}>
        {children}
      </EveFrontierProvider>
    </QueryClientProvider>
  );
}
