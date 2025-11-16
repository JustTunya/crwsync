import type { Metadata } from "next";
import { Figtree } from "next/font/google";
import { UserProvider } from "@/providers/user.provider";
import { getSession } from "@/lib/auth";
import "@/app/globals.css";
import Background from "@/components/ui/background";

const figtree = Figtree({
  variable: "--font-figtree",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "800"],
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
      <body className={`${figtree.variable} font-figtree antialiased`}>
        <Background />
        <UserProvider user={user}>
          {children}
        </UserProvider>
      </body>
    </html>
  );
}
