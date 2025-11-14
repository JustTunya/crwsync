import type { Metadata } from "next";
import { Roboto } from "next/font/google";
import { UserProvider } from "@/providers/user.provider";
import { getSession } from "@/lib/auth";
import "@/app/globals.css";

const roboto = Roboto({
  variable: "--font-roboto",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  display: "swap"
});

export const metadata: Metadata = {
  title: "crwsync",
  description: "crwsync is real-time task management platform for teams and individuals.",
  appleWebApp: {
    title: "crwsync",
    statusBarStyle: "default"
  }
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await getSession();

  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${roboto.variable} font-roboto antialiased`}>
        <div className="fixed inset-0 size-full bg-base-300">
          <div className="absolute inset-0 size-full bg-[radial-gradient(var(--color-muted)_1.6px,transparent_1px)] [background-size:16px_16px] [mask-image:radial-gradient(ellipse_50%_50%_at_50%_50%,#000_70%,transparent_100%)]" />
        </div>

        <UserProvider user={user}>
          {children}
        </UserProvider>
      </body>
    </html>
  );
}
