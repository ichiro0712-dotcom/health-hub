import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "react-hot-toast";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

import Providers from "@/components/Providers";
import AutoSyncProvider from "@/components/AutoSyncProvider";

export const metadata: Metadata = {
  title: "Health Hub",
  description: "あなたの健康を見える化",
  viewport: "width=device-width, initial-scale=1, viewport-fit=cover",
  manifest: "/manifest.json",
  icons: {
    icon: "/favicon.png",
    apple: "/apple-touch-icon.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Health Hub",
  },
  themeColor: "#0f172a",
};

import BottomNav from "@/components/BottomNav";
import MobileLayoutFix from "@/components/MobileLayoutFix";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Providers>
          <AutoSyncProvider>
            <MobileLayoutFix />
            <div className="pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] min-h-screen">
              {children}
            </div>
            <BottomNav />
          </AutoSyncProvider>
        </Providers>
        <Toaster />
      </body>
    </html>
  );
}
