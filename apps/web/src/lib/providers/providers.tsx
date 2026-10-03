"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { useState } from "react";
import type { ReactNode } from "react";

import { TooltipProvider } from "@/components/ui/tooltip";
import { TRPCProvider, createClient } from "@/lib/trpc";

import { MapContextProvider } from "./map-provider";

const DAY_MS = 24 * 60 * 60 * 1000;

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { gcTime: DAY_MS, refetchOnWindowFocus: false },
        },
      }),
  );

  const [trpcClient] = useState(createClient);

  return (
    <QueryClientProvider client={queryClient}>
      <TRPCProvider trpcClient={trpcClient} queryClient={queryClient}>
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          <MapContextProvider>
            <TooltipProvider delayDuration={300}>{children}</TooltipProvider>
          </MapContextProvider>
        </ThemeProvider>
      </TRPCProvider>
    </QueryClientProvider>
  );
}
