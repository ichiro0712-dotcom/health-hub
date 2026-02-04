import type { Metadata, Viewport } from "next";
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

// Next.js 14+: viewportとthemeColorは別途exportする
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#0f172a",
};

export const metadata: Metadata = {
  title: "Health Hub",
  description: "あなたの健康を見える化",
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
};

import FloatingMenu from "@/components/FloatingMenu";
import MobileLayoutFix from "@/components/MobileLayoutFix";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Providers>
          <AutoSyncProvider>
            <MobileLayoutFix />
            {/* スキップリンク（アクセシビリティ: M-6） */}
            <a
              href="#main-content"
              className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:bg-teal-600 focus:text-white focus:px-4 focus:py-2 focus:rounded-lg focus:shadow-lg"
            >
              メインコンテンツへスキップ
            </a>
            <div id="main-content" className="pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] min-h-screen">
              {children}
            </div>
            <FloatingMenu />
          </AutoSyncProvider>
        </Providers>
        <Toaster />
      </body>
    </html>
  );
}
