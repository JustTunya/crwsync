import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "crwsync | Mission-Critical Real-Time Collaboration",
  description:
    "crwsync is a highly scalable, real-time collaborative workspace platform engineered to streamline enterprise project management, synchronizing tasks, chat, and files with sub-millisecond latency.",
  keywords: [
    "crwsync",
    "real-time collaboration",
    "project management",
    "workspace",
    "team synchronization",
    "enterprise",
    "WebSocket",
    "Redis",
  ],
  authors: [{ name: "Tunya Lénárd-Sándor" }],
  openGraph: {
    title: "crwsync | Mission-Critical Real-Time Collaboration",
    description:
      "Highly scalable, real-time workspace platform with sub-millisecond latency.",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#0A0A0A",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} font-sans antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
