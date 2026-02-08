import type { Metadata } from "next";
import { Suspense } from "react";
import { Figtree } from "next/font/google";
import { ThemeProvider } from "next-themes";
import Background from "@/components/ui/background";
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
  title: "crwsync",
  description: "crwsync is real-time task management platform for teams and individuals.",
  appleWebApp: {
    title: "crwsync",
    statusBarStyle: "default"
  }
};

async function UserSession({ children }: { children: React.ReactNode }) {
  const user = await getSession();
  return <UserProvider user={user}>{children}</UserProvider>;
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${figtree.variable} font-figtree antialiased`} suppressHydrationWarning>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <Background />
          <Suspense fallback={<div className="min-h-screen bg-background" />}>
            <UserSession>{children}</UserSession>
          </Suspense>
        </ThemeProvider>
      </body>
    </html>
  );
}
