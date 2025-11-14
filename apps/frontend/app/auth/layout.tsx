import Image from "next/image";
import Link from "next/link";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <div className="absolute inset-0 h-min w-full p-8">
        <Link href="/" className="inline-block">
          <Image
            src="/logo.svg"
            alt="crwsync"
            width={4321}
            height={576}
            className="h-6 sm:w-auto"
            priority
          />
        </Link>
      </div>
      {children}
    </>
  );
}
