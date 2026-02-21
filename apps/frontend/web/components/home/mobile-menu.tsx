import Link from "next/link";
import { m, Variants, LazyMotion, domAnimation } from "framer-motion";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowRight01Icon } from "@hugeicons/core-free-icons";

const MAX_INDEX = 5;

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

export default function MobileMenu({ setOpen }: MobileMenuProps) {
  return (
    <LazyMotion features={domAnimation} strict>
      <m.nav
        className="flex flex-col gap-3 w-full"
        variants={container}
        initial="hidden"
        animate="visible"
        exit="exit"
      >
        <m.div className="flex flex-col gap-2" variants={item}>
          <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground ml-2">
            Product
          </span>
        </m.div>

        <div className="flex flex-col gap-1.5">
          <MobileItem
            index={0}
            href="#overview"
            title="Overview"
            description="What is crwsync?"
            onClick={() => setOpen(false)}
          />
          <MobileItem
            index={1}
            href="/modules"
            title="Modules"
            description="What does crwsync include?"
            onClick={() => setOpen(false)}
          />
          <MobileItem
            index={2}
            href="/solutions"
            title="Solutions"
            description="Who is crwsync for?"
            onClick={() => setOpen(false)}
          />
        </div>

        <m.div className="h-px bg-border my-2" variants={item} />

        <div className="flex flex-col gap-2">
          <MobileRow index={3} href="/roadmap" label="Roadmap" onClick={() => setOpen(false)} />
          <MobileRow index={4} href="/changelog" label="Changelog" onClick={() => setOpen(false)} />
          <MobileRow index={5} href="/founder" label="Founder" onClick={() => setOpen(false)} />
        </div>
      </m.nav>
    </LazyMotion>
  );
}

interface MobileItemProps {
  index: number;
  href: string;
  title: string;
  description: string;
  onClick?: () => void;
}

function MobileItem({ index, href, title, description, onClick }: MobileItemProps) {
  return (
    <m.div variants={item} custom={index}>
      <Link
        href={href}
        onClick={onClick}
        className="group flex flex-col gap-[0.1rem] rounded-lg w-full px-3 py-2 bg-background/85 dark:bg-foreground/5 hover:bg-primary/15 transition-colors"
      >
        <span className="text-sm font-medium text-foreground group-hover:text-primary">
          {title}
        </span>
        <span className="text-xs text-muted-foreground leading-snug group-hover:text-primary/60">
          {description}
        </span>
      </Link>
    </m.div>
  );
}

interface MobileRowProps {
  index: number;
  href: string;
  label: string;
  onClick?: () => void;
}

function MobileRow({ index, href, label, onClick }: MobileRowProps) {
  return (
    <m.div variants={item} custom={index}>
      <Link href={href} onClick={onClick} className="text-xl text-foreground font-semibold">
        <div className="group flex items-center justify-between p-2 hover:text-primary transition-colors">
          <span>{label}</span>
          <HugeiconsIcon
            icon={ArrowRight01Icon}
            strokeWidth={2}
            className="size-6 group-hover:translate-x-2 transition-transform"
          />
        </div>
      </Link>
    </m.div>
  );
}