"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, useEffect } from "react";
import { m, Variants, LazyMotion, domAnimation, AnimatePresence } from "framer-motion";
import { HugeiconsIcon } from "@hugeicons/react";
import { Menu01Icon, Cancel01Icon } from "@hugeicons/core-free-icons";
import { useMobile } from "@/hooks/use-mobile";
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  navigationMenuTriggerStyle,
} from "@/components/ui/navigation-menu"
import { cn } from "@/lib/utils";

const menuItems = [
  { href: "/#sync", title: "How it syncs" },
  { href: "/#product", title: "Product" },
  { href: "/#architecture", title: "Architecture" },
  { href: "/#reliability", title: "Reliability" },
  { href: "/#contact", title: "Contact" },
];

export default function Header() {
  const isMobile = useMobile();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!isMobile) {
      setTimeout(() => setOpen(false), 0);
    }
  }, [isMobile]);

  return (
    <>
      <header
        role="banner"
        className={cn(
          "fixed inset-x-0 z-40 flex flex-col items-start gap-12 w-[calc(100vw-2rem)] h-auto m-4 px-3 py-2 bg-background/70 dark:bg-background/60 border border-border backdrop-saturate-100 shadow-lg shadow-black/5 rounded-xl",
          open ? "backdrop-blur-xl" : "backdrop-blur-md",
          "transition-[height, backdrop-filter] duration-500 ease-in-out"
        )}
      >
        <div className="w-full flex items-center justify-between">
          <div className="flex items-center justify-center gap-4 ml-1">
            <Link href="/" className="inline-block z-10 rounded-sm focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring">
              {isMobile ? (
                <Image
                  src="/icon@orange.svg"
                  alt="crwsync"
                  width={28}
                  height={28}
                  className="size-5"
                  priority
                  quality={90}
                />
              ) : (
                <Image
                  src="/logo@orange.svg"
                  alt="crwsync"
                  width={162}
                  height={24}
                  className="h-5 w-min"
                  priority
                  quality={90}
                />
              )}
            </Link>
          </div>

          <NavMenu />

          <div className="flex items-center gap-2 z-10">
            <Link
              href="/auth/signin"
              className="
                p-1 px-2 sm:px-3 sm:py-1 rounded-md
                text-xs sm:text-sm text-muted-foreground font-medium whitespace-nowrap
                hover:text-foreground transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              Sign In
            </Link>
            <Link
              href="/auth/signup"
              className="
                group relative bg-primary p-1 px-2 sm:px-3 rounded-md
                text-xs sm:text-sm text-primary-foreground font-semibold whitespace-nowrap focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              <div className="absolute inset-0 size-auto bg-linear-to-t from-foreground/15 group-hover:from-foreground/30 to-transparent rounded-md transition-colors" />
              <span className="relative">Get Started</span>
            </Link>
            {isMobile && (
              <button
                type="button"
                aria-label="Toggle navigation menu"
                aria-expanded={open}
                onClick={() => {
                  setOpen(!open);
                }}
                className="ml-2 rounded-md p-1 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              >
                <HugeiconsIcon
                  icon={open ? Cancel01Icon : Menu01Icon}
                  strokeWidth={2}
                  className="size-5 text-muted-foreground hover:text-foreground transition-colors"
                />
              </button>
            )}
          </div>
        </div>

        <AnimatePresence initial={false} mode="wait">
          {isMobile && open && <MobileMenu key="mobile-menu" setOpen={setOpen} />}
        </AnimatePresence>
      </header>
    </>
  );
}

// NAVIGATION

export function NavMenu() {
  const isMobile = useMobile()

  if (isMobile) {
    return null
  }

  return (
    <NavigationMenu aria-label="Main navigation">
      <NavigationMenuList className="flex items-center justify-center lg:gap-4">
        {menuItems.map((item, index) => (
          <NavigationMenuItem key={item.href}>
            <NavigationMenuLink asChild className={cn(navigationMenuTriggerStyle(), index >= 3 && "hidden lg:inline-flex")}>
              <Link href={item.href}>{item.title}</Link>
            </NavigationMenuLink>
          </NavigationMenuItem>
        ))}
      </NavigationMenuList>
    </NavigationMenu>
  )
}

// MOBILE VERSION

const MAX_INDEX = menuItems.length - 1;

const container: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
      staggerDirection: 1,
    },
  },
  exit: {
    transition: {
      staggerChildren: 0.05,
      staggerDirection: -1,
    },
  },
};

const item: Variants = {
  hidden: {
    opacity: 0,
    y: 4,
    filter: "blur(8px)",
  },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: {
      duration: 0.3,
      ease: "easeOut",
      delay: 0.03 + i * 0.05
    },
  }),
  exit: (i: number) => ({
    opacity: 0,
    y: 4,
    filter: "blur(8px)",
    transition: {
      duration: 0.3,
      ease: "easeIn",
      delay: (MAX_INDEX - i) * 0.03
    },
  }),
};

interface MobileMenuProps {
  setOpen: (open: boolean) => void
}

export function MobileMenu({ setOpen }: MobileMenuProps) {
  return (
    <LazyMotion features={domAnimation} strict>
      <m.nav
        aria-label="Main navigation"
        className="flex flex-col gap-2 w-full"
        variants={container}
        initial="hidden"
        animate="visible"
        exit="exit"
      >
        {menuItems.map((item, index) => (
          <MobileItem
            key={index}
            index={index}
            href={item.href}
            title={item.title}
            onClick={() => setOpen(false)}
          />
        ))}
      </m.nav>
    </LazyMotion>
  );
}

interface MobileItemProps {
  index: number;
  href: string;
  title: string;
  onClick: () => void;
}

function MobileItem({ index, href, title, onClick }: MobileItemProps) {
  return (
    <m.a href={href} variants={item} custom={index} className="block last:mb-1 cursor-pointer" onClick={onClick}>
      <span className="text-base font-semibold text-foreground leading-tight">
        {title}
      </span>

      {index < MAX_INDEX && <div className="w-full h-px my-1 bg-foreground/15" />}
    </m.a>
  );
}
