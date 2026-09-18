import type { Metadata } from "next";
import { Suspense } from "react";
import { Figtree } from "next/font/google";
import { ThemeProvider } from "next-themes";
import { UserProvider } from "@/providers/user.provider";
import { getSession } from "@/lib/auth.server";
import { I18nProvider } from "@crwsync/i18n";
import { SkipToContent } from "@/components/a11y/skip-to-content";
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

const siteUrl = process.env.NEXT_PUBLIC_WEB_URL ?? "https://crwsync.xyz";
const title = "crwsync: real-time crew collaboration, engineered end to end";
const description =
  "A production-shaped team workspace: boards, chat, files, and schedules kept in sync over WebSockets, behind a NestJS API with Redis fan-out, BullMQ queues, and Postgres. Built solo, with a live demo.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: title, template: "%s | crwsync" },
  description,
  applicationName: "crwsync",
  authors: [{ name: "Tunya Lénárd-Sándor", url: "https://www.linkedin.com/in/lenard-tunya/" }],
  keywords: ["real-time collaboration", "kanban", "team chat", "NestJS", "Next.js", "Socket.IO", "BullMQ", "Prisma", "portfolio"],
  openGraph: {
    type: "website",
    siteName: "crwsync",
    url: siteUrl,
    title,
    description,
    images: [{ url: "/demo/poster.png", alt: "The crwsync dashboard with a board, chat, and files open" }],
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
    images: ["/demo/poster.png"],
  },
  robots: { index: true, follow: true },
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
        <I18nProvider>
          <SkipToContent />
          <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
            <Suspense fallback={<div className="min-h-screen w-screen bg-background overflow-x-hidden" />}>
              <UserSession>{children}</UserSession>
            </Suspense>
          </ThemeProvider>
        </I18nProvider>
      </body>
    </html>
  );
}
