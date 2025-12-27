import type { Metadata } from "next";
import { Figtree } from "next/font/google";
import { Suspense } from "react";
import { UserProvider } from "@/providers/user.provider";
import { getSession } from "@/lib/auth.server";
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

async function UserSession({ children }: { children: React.ReactNode }) {
  const user = await getSession();
  return <UserProvider user={user}>{children}</UserProvider>;
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${figtree.variable} font-figtree antialiased`}>
        <Suspense fallback={<div className="min-h-screen bg-slate-950" />}>
          <UserSession>{children}</UserSession>
        </Suspense>
      </body>
    </html>
  );
}