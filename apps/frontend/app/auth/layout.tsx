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
          <Image src="/logo@orange.svg" alt="crwsync" width={3250} height={512} className="h-8 sm:w-auto" priority />
        </Link>
      </div>

      <div className="my-24 sm:my-32">{children}</div>
    </>
  );
}
