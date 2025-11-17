import Image from "next/image";
import { HugeiconsIcon } from "@hugeicons/react";
import { Mail01Icon } from "@hugeicons/core-free-icons";
import { cn } from "@/lib/utils";
import { s } from "framer-motion/client";

const socials = [
  {
    name: "Bluesky",
    svg: "/icons/bluesky.svg",
    href: "https://bsky.app/profile/crwsync.com",
    alt: "Visit crwsync on Bluesky",
  },
  // {
  //   name: "Discord",
  //   svg: "/icons/discord.svg",
  //   href: "https://discord.gg/crwsync",
  //   alt: "Join the crwsync Discord server",
  // },
  {
    name: "Facebook",
    svg: "/icons/facebook.svg",
    href: "https://www.facebook.com/profile.php?id=61580205407258#",
    alt: "Visit crwsync on Facebook",
  },
  {
    name: "Instagram",
    svg: "/icons/instagram.svg",
    href: "https://www.instagram.com/crwsync",
    alt: "Visit crwsync on Instagram",
  },
  // {
  //   name: "LinkedIn",
  //   svg: "/icons/linkedin.svg",
  //   href: "https://www.linkedin.com/company/crwsync",
  //   alt: "Visit crwsync on LinkedIn",
  // },
  {
    name: "TikTok",
    svg: "/icons/tiktok.svg",
    href: "https://www.tiktok.com/@crwsync",
    alt: "Visit crwsync on TikTok",
  },
  // {
  //   name: "YouTube",
  //   svg: "/icons/youtube.svg",
  //   href: "https://www.youtube.com/@crwsync",
  //   alt: "Visit crwsync on YouTube",
  // },
  {
    name: "X (Twitter)",
    svg: "/icons/x.svg",
    href: "https://x.com/crwsync",
    alt: "Visit crwsync on X (Twitter)",
  }
];

function Icon({ svg, className, children }: { svg: string; className?: string; children?: React.ReactNode }) {
  return (
    <div
      className={cn("relative size-16", className)}
      style={{ 
        WebkitMaskImage: `url('${svg}')`,
        WebkitMaskRepeat: "no-repeat",
        WebkitMaskPosition: "center",
        WebkitMaskSize: "contain",
        maskImage: `url('${svg}')`,
        maskRepeat: "no-repeat",
        maskPosition: "center",
        maskSize: "contain",
      }}
    >
      {children}
    </div>
  );
}

export default function Footer() {
  return (
    <footer className="bg-foreground flex items-center justify-between px-12 py-16">
      <div className="flex items-center gap-6">
        <Image src="/logo@white.svg" alt="crwsync" width={3250} height={512} className="h-6 sm:w-auto" priority />
        <div className="w-0 h-8 border-l border-muted-foreground"/>
        <p className="text-muted-foreground">&copy; 2025 crwsync. All rights reserved.</p>
      </div>

      <div className="flex justify-between gap-32">
        <div className="flex flex-col gap-3">
          <p className="text-background font-semibold">Getting Started</p>
          <a href="#" className="text-muted-foreground font-light hover:text-background transition-colors">About Us</a>
          <a href="#" className="text-muted-foreground font-light hover:text-background transition-colors">Introduction</a>
          <a href="#" className="text-muted-foreground font-light hover:text-background transition-colors">Documentation</a>
        </div>

        <div className="flex flex-col gap-3">
          <p className="text-background font-semibold">Resources</p>
          <a href="#" className="text-muted-foreground font-light hover:text-background transition-colors">Community</a>
          <a href="#" className="text-muted-foreground font-light hover:text-background transition-colors">Tutorials</a>
          <a href="#" className="text-muted-foreground font-light hover:text-background transition-colors">Templates</a>
        </div>

        <div className="flex flex-col gap-3">
          <p className="text-background font-semibold">Terms & Policies</p>
          <a href="#" className="text-muted-foreground font-light hover:text-background transition-colors">Terms of Service</a>
          <a href="#" className="text-muted-foreground font-light hover:text-background transition-colors">Privacy Policy</a>
          <a href="#" className="text-muted-foreground font-light hover:text-background transition-colors">Other policies</a>
        </div>

        <div className="flex flex-col gap-3">
          <p className="text-background font-semibold">Socials</p>
          {socials.map((social) => (
            <a
              key={social.name}
              href={social.href}
              className="flex items-center gap-2 text-muted-foreground font-light hover:text-background transition-colors"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Icon svg={social.svg} className="size-5 bg-muted-foreground" />
              {social.name}
            </a>
          ))}
        </div>
      </div>
    </footer>
  );
}