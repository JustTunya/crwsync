import type { Metadata } from "next";
import { Suspense } from "react";
import { Figtree } from "next/font/google";
import { ThemeProvider } from "next-themes";
import { UserProvider } from "@/providers/user.provider";
import { QueryProvider } from "@/providers/query.provider";
import { WorkspaceProvider } from "@/providers/workspace.provider";
import "@crwsync/styles";

const figtree = Figtree({
  variable: "--font-figtree",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "800"],
  display: "swap",
  preload: true,
  fallback: ["system-ui", "arial"],
  adjustFontFallback: true
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
          <WorkspaceProvider>
            {children}
          </WorkspaceProvider>
        </UserProvider>
      </QueryProvider>
    </ThemeProvider>
  );
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${figtree.variable} font-figtree antialiased`} suppressHydrationWarning>
        <Suspense fallback={<div className="min-h-screen bg-slate-950" />}>
          <Providers>
            {children}
          </Providers>
        </Suspense>
      </body>
    </html>
  );
}
