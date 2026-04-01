"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
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
        className={cn(
          "fixed inset-x-0 z-40 flex flex-col items-start gap-12 w-[calc(100vw-2rem)] h-auto m-4 px-3 py-2 bg-background/15 dark:bg-foreground/10 border border-foreground/15 backdrop-saturate-100 shadow-lg shadow-black/5 rounded-xl",
          open ? "backdrop-blur-xl" : "backdrop-blur-sm",
          "transition-[height, backdrop-filter] duration-500 ease-in-out"
        )}
      >
        <div className="w-full flex items-center justify-between">
          <div className="flex items-center justify-center gap-4 ml-1">
            <Link href="/" className="inline-block z-10">
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
                text-xs sm:text-sm text-muted-foreground font-medium foregroundspace-nowrap
                hover:text-foreground transition-colors"
            >
              Sign In
            </Link>
            <Link
              href="/auth/signup"
              className="
                group relative bg-primary p-1 px-2 sm:px-3 rounded-md
                text-xs sm:text-sm text-primary-foreground font-semibold foregroundspace-nowrap"
            >
              <div className="absolute inset-0 size-auto bg-linear-to-t from-foreground/15 group-hover:from-foreground/30 to-transparent rounded-lg transition-colors" />
              Get Started
            </Link>
            {isMobile && (
              open ? (
                <HugeiconsIcon
                  icon={Cancel01Icon}
                  strokeWidth={2}
                  onClick={() => {
                    setOpen(false);
                  }}
                  className="size-5 ml-2 text-muted-foreground hover:text-foreground transition-colors"
                />
              ) : (
                <HugeiconsIcon
                  icon={Menu01Icon}
                  strokeWidth={2}
                  onClick={() => {
                    setOpen(true);
                  }}
                  className="size-5 ml-2 text-muted-foreground hover:text-foreground transition-colors"
                />
              )
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
    <NavigationMenu>
      <NavigationMenuList className="flex items-center justify-center lg:gap-6">
        <NavigationMenuItem>
          <NavigationMenuLink asChild className={navigationMenuTriggerStyle()}>
            <Link href="#features">Features</Link>
          </NavigationMenuLink>
        </NavigationMenuItem>
        <NavigationMenuItem>
          <NavigationMenuLink asChild className={navigationMenuTriggerStyle()}>
            <Link href="#architecture">Architecture</Link>
          </NavigationMenuLink>
        </NavigationMenuItem>
        <NavigationMenuItem>
          <NavigationMenuLink asChild className={navigationMenuTriggerStyle()}>
            <Link href="#stack">Stack</Link>
          </NavigationMenuLink>
        </NavigationMenuItem>
        <NavigationMenuItem>
          <NavigationMenuLink asChild className={cn(navigationMenuTriggerStyle(), "hidden lg:inline-flex")}>
            <Link href="#founder">Founder</Link>
          </NavigationMenuLink>
        </NavigationMenuItem>
        <NavigationMenuItem>
          <NavigationMenuLink asChild className={cn(navigationMenuTriggerStyle(), "hidden lg:inline-flex")}>
            <Link href="#contact">Contact</Link>
          </NavigationMenuLink>
        </NavigationMenuItem>
      </NavigationMenuList>
    </NavigationMenu>
  )
}

// MOBILE VERSION

const MAX_INDEX = 4;

const menuItems = [
  {
    href: "#features",
    title: "Features",
  },
  {
    href: "#architecture",
    title: "Architecture",
  },
  {
    href: "#stack",
    title: "Stack",
  },
  {
    href: "#founder",
    title: "Founder",
  },
  {
    href: "#contact",
    title: "Contact",
  },
];

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
  const router = useRouter();

  return (
    <m.div variants={item} custom={index} className="last:mb-1 cursor-pointer" onClick={() => {
      onClick();
      router.push(href);
    }}>
      <span className="text-base font-semibold text-foreground leading-tight">
        {title}
      </span>

      {index < MAX_INDEX && <div className="w-full h-px my-1 bg-foreground/15" />}
    </m.div>
  );
}