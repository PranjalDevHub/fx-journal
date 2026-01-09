import "./globals.css";
import type { Metadata } from "next";

import Providers from "@/components/providers";
import AppShell from "@/components/app-shell";

export const metadata: Metadata = {
  title: "FX Journal",
  description: "Offline-first FX journal",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>
          <AppShell>{children}</AppShell>
        </Providers>
      </body>
    </html>
  );
}