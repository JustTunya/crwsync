import type { Metadata } from "next";
import { Figtree } from "next/font/google";
import { Suspense } from "react";
import { UserProvider } from "@/providers/user.provider";
import { getSession } from "@/lib/auth";
import "@/app/globals.css";
import Background from "@/components/ui/background";

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
  title: "crwsync",
  description: "crwsync is real-time task management platform for teams and individuals.",
  appleWebApp: {
    title: "crwsync",
    statusBarStyle: "default"
  }
};

// Separate async component for user session to enable Suspense boundary
// This allows the page shell to render immediately while auth check happens in parallel
async function UserSession({ children }: { children: React.ReactNode }) {
  const user = await getSession();
  return <UserProvider user={user}>{children}</UserProvider>;
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${figtree.variable} font-figtree antialiased`}>
        <Background />
        {/* Suspense enables streaming: page shell renders first, auth loads async */}
        <Suspense fallback={<div className="min-h-screen bg-background" />}>
          <UserSession>{children}</UserSession>
        </Suspense>
      </body>
    </html>
  );
}
