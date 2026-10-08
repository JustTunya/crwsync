import type { Metadata } from "next";
import localFont from "next/font/local";
import { ThemeProvider } from "next-themes";
import { I18nProvider } from "@crwsync/i18n";
import { SkipToContent } from "@/components/a11y/skip-to-content";
import { siteUrl } from "@/lib/site";
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

const title = "crwsync: boards, chat, and files for small teams";
const description =
  "A shared workspace for small teams: task boards, chat rooms, files, and schedules in one place, updated live in every open tab, with optional Claude-powered summaries. Join the early-access waitlist or try the demo.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: title, template: "%s | crwsync" },
  description,
  applicationName: "crwsync",
  authors: [{ name: "Tunya Lénárd-Sándor", url: "https://www.linkedin.com/in/lenard-tunya/" }],
  openGraph: {
    type: "website",
    siteName: "crwsync",
    locale: "en_US",
    url: siteUrl,
    title,
    description,
    images: [{ url: "/demo/poster.png", width: 1920, height: 1080, alt: "The crwsync dashboard with a board, chat, and files open" }],
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
    images: [{ url: "/demo/poster.png", alt: "The crwsync dashboard with a board, chat, and files open" }],
  },
  robots: { index: true, follow: true, googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1, "max-video-preview": -1 } },
  appleWebApp: {
    title: "crwsync",
    statusBarStyle: "default"
  }
};

export default function RootLayout({
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
            {children}
          </ThemeProvider>
        </I18nProvider>
      </body>
    </html>
  );
}
