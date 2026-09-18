import Image from "next/image";
import Link from "next/link";

const columns = [
  {
    title: "Product",
    links: [
      { href: "/auth/signin", label: "Sign in" },
      { href: "/auth/signup", label: "Create account" },
      { href: "/#product", label: "Surfaces" },
      { href: "/#architecture", label: "Architecture" },
    ],
  },
  {
    title: "Builder",
    links: [
      { href: "https://github.com/justtunya/crwsync", label: "Source on GitHub" },
      { href: "https://www.linkedin.com/in/lenard-tunya/", label: "LinkedIn" },
      { href: "/#contact", label: "Contact" },
    ],
  },
  {
    title: "Legal",
    links: [
      { href: "/legal/terms", label: "Terms of Service" },
      { href: "/legal/privacy", label: "Privacy Policy" },
    ],
  },
];

export default function Footer() {
  return (
    <footer role="contentinfo" className="border-t border-border">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:px-8 md:grid-cols-12 lg:border-x lg:border-border">
        <div className="flex flex-col gap-3 md:col-span-6">
          <Link href="/" className="inline-flex w-fit">
            <Image src="/logo@orange.svg" alt="crwsync" width={162} height={24} className="h-6 w-auto dark:hidden" />
            <Image src="/logo@white.svg" alt="crwsync" width={162} height={24} className="hidden h-6 w-auto dark:block" />
          </Link>
          <p className="max-w-[40ch] text-sm text-muted-foreground">
            A production-shaped collaboration platform, built solo as a portfolio system. Demo data only.
          </p>
          <p className="text-xs text-muted-foreground">© 2026 Tunya Lénárd-Sándor. All rights reserved.</p>
        </div>
        {columns.map((column) => (
          <div key={column.title} className="md:col-span-2">
            <h2 className="text-sm font-semibold">{column.title}</h2>
            <ul className="mt-3 flex flex-col gap-2">
              {column.links.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring rounded-sm"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </footer>
  );
}
