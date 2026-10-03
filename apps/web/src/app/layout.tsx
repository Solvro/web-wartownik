import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import type { ReactNode } from "react";

import { Analytics } from "@/components/analytics";
import { Toaster } from "@/components/ui/sonner";
import { env } from "@/env";
import { Providers } from "@/lib/providers/providers";

import "./globals.css";

const geist = Geist({
  subsets: ["latin", "latin-ext"],
  variable: "--font-geist",
});
const geistMono = Geist_Mono({
  subsets: ["latin", "latin-ext"],
  variable: "--font-geist-mono",
});

export const metadata: Metadata = {
  title: "Defensownik",
  description:
    "Mapa bezpieczeństwa Polski na żywo: zagrożenia powietrzne, schrony, AED, pożary, jakość powietrza i stany rzek.",
  metadataBase: new URL(env.NEXT_PUBLIC_SITE_URL),
  openGraph: {
    url: env.NEXT_PUBLIC_SITE_URL,
    images: [{ url: "/og-image.png", width: 1200, height: 630 }],
  },
  twitter: { card: "summary_large_image", images: ["/og-image.png"] },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0f" },
  ],
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pl" suppressHydrationWarning>
      <body
        className={`${geist.variable} ${geistMono.variable} font-sans antialiased`}
      >
        <Providers>
          {children}
          <Toaster richColors position="top-center" />
        </Providers>
        <Analytics />
      </body>
    </html>
  );
}
