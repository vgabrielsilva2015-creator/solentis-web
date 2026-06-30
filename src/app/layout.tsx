import type { Metadata } from "next";
import { Sora, IBM_Plex_Sans, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import { CommandMenu } from "@/components/ui/command-menu";
import { Analytics } from "@vercel/analytics/next";
import { ThemeScript } from "@/components/theme-provider";
import { OfflineIndicator } from "@/components/offline-indicator";
import { SyncManager } from "@/components/sync-manager";
import { ToastProvider } from "@/components/ui/toast";
import type { Viewport } from "next";

const sora = Sora({
  variable: "--font-sora",
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
});

const ibmPlexSans = IBM_Plex_Sans({
  variable: "--font-ibm-plex-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

const ibmPlexMono = IBM_Plex_Mono({
  variable: "--font-ibm-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: "Solentis",
  description: "Sistema de gestão de Estação de Tratamento de Efluentes",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Solentis",
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  themeColor: "#0f172a",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt-BR"
      className={`${sora.variable} ${ibmPlexSans.variable} ${ibmPlexMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <ThemeScript />
      </head>
      <body className="min-h-full flex flex-col">
        <OfflineIndicator />
        <SyncManager />
        <ToastProvider position="bottom-right">
          {children}
        </ToastProvider>
        <CommandMenu />
        <Analytics />
      </body>
    </html>
  );
}
