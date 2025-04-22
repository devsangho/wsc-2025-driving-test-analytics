"use client";

import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";
import { DataProvider } from "./contexts/data-context";
import { Analytics } from "@vercel/analytics/react"

const inter = Inter({ subsets: ["latin"] });

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Analytics />
        <DataProvider>
          {children}
          <Toaster richColors closeButton position="top-right" />
        </DataProvider>
      </body>
    </html>
  );
}
