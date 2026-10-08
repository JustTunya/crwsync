import type { Metadata } from "next";
import { Suspense } from "react";
import localFont from "next/font/local";
import { ThemeProvider } from "next-themes";
import { UserProvider } from "@/providers/user.provider";
import { QueryProvider } from "@/providers/query.provider";
import { WorkspaceProvider } from "@/providers/workspace.provider";
import { SocketProvider } from "@/providers/socket.provider";
import { I18nProvider } from "@crwsync/i18n";
import { LiveAnnouncerProvider } from "@/components/a11y/live-announcer";
import { SkipToContent } from "@/components/a11y/skip-to-content";
import "@crwsync/styles";

const figtree = localFont({
  src: "./fonts/figtree-latin-wght.woff2",
  variable: "--font-figtree",
  weight: "300 800",
  display: "swap",
  preload: true,
  fallback: ["system-ui", "arial"],
  adjustFontFallback: "Arial"
});

export const metadata: Metadata = {
  title: "Dashboard | crwsync",
  description: "Sync. Simplify. Succeed. - CRWSYNC Dashboard",
  appleWebApp: { title: "crwsync", statusBarStyle: "default" }
};

async function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <QueryProvider>
        <UserProvider>
          <SocketProvider>
            <WorkspaceProvider>
              {children}
            </WorkspaceProvider>
          </SocketProvider>
        </UserProvider>
      </QueryProvider>
    </ThemeProvider>
  );
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${figtree.variable} font-figtree antialiased`} suppressHydrationWarning>
        <I18nProvider>
          <LiveAnnouncerProvider>
            <SkipToContent />
            <Suspense fallback={<div />}>
              <Providers>
                {children}
              </Providers>
            </Suspense>
          </LiveAnnouncerProvider>
        </I18nProvider>
      </body>
    </html>
  );
}
