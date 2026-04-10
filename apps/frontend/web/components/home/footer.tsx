import Image from "next/image";
import Link from "next/link";

// const socials = [
//   {
//     name: "Bluesky",
//     svg: "/icons/bluesky.svg",
//     href: "https://bsky.app/profile/crwsync.com",
//     alt: "Visit crwsync on Bluesky",
//   },
//   {
//     name: "Discord",
//     svg: "/icons/discord.svg",
//     href: "https://discord.gg/crwsync",
//     alt: "Join the crwsync Discord server",
//   },
//   {
//     name: "Facebook",
//     svg: "/icons/facebook.svg",
//     href: "https://www.facebook.com/profile.php?id=61580205407258#",
//     alt: "Visit crwsync on Facebook",
//   },
//   {
//     name: "Instagram",
//     svg: "/icons/instagram.svg",
//     href: "https://www.instagram.com/crwsync",
//     alt: "Visit crwsync on Instagram",
//   },
//   {
//     name: "LinkedIn",
//     svg: "/icons/linkedin.svg",
//     href: "https://www.linkedin.com/company/crwsync",
//     alt: "Visit crwsync on LinkedIn",
//   },
//   {
//     name: "TikTok",
//     svg: "/icons/tiktok.svg",
//     href: "https://www.tiktok.com/@crwsync",
//     alt: "Visit crwsync on TikTok",
//   },
//   {
//     name: "YouTube",
//     svg: "/icons/youtube.svg",
//     href: "https://www.youtube.com/@crwsync",
//     alt: "Visit crwsync on YouTube",
//   },
//   {
//     name: "X (Twitter)",
//     svg: "/icons/x.svg",
//     href: "https://x.com/crwsync",
//     alt: "Visit crwsync on X (Twitter)",
//   }
// ];

// const categories = [
//   {
//     title: "Getting Started",
//     links: [
//       { name: "About Us", href: "#" },
//       { name: "Introduction", href: "#" },
//       { name: "Documentation", href: "#" },
//     ],
//   },
//   {
//     title: "Resources",
//     links: [
//       { name: "Community", href: "#" },
//       { name: "Tutorials", href: "#" },
//       { name: "Templates", href: "#" },
//     ],
//   },
//   {
//     title: "Terms & Policies",
//     links: [
//       { name: "Terms of Service", href: "#" },
//       { name: "Privacy Policy", href: "#" },
//       { name: "Other policies", href: "#" },
//     ],
//   },
// ];

export default function Footer() {
  return (
    <footer className="grid grid-cols-1 md:grid-cols-2 items-center sm:justify-between gap-x-32 gap-y-16 bg-foreground dark:bg-background border-t border-base-300 px-8 sm:px-24 lg:px-32 py-16">
      <div className="flex flex-col items-center gap-2">
        <Link href="/">
          <Image src="/logo@white.svg" alt="crwsync" width={3250} height={512} className="h-7 xl:h-8 md:w-auto" priority />
        </Link>

        <p className="text-xs text-foreground font-light">© 2026 Tunya Lénárd-Sándor. All rights reserved.</p>
      </div>

      {/* <div className="grid grid-cols-2 lg:grid-cols-4 gap-16 sm:gap-x-32 lg:gap-32">
        {categories.map((category) => (
          <div key={category.title} className="flex flex-col gap-3 min-w-26 text-sm sm:text-base whitespace-nowrap">
            <p className="text-background dark:text-foreground font-semibold mb-2 sm:mb-4">{category.title}</p>
            {category.links.map((link) => (
              <a
                key={link.name}
                href={link.href}
                className="text-muted-foreground font-light hover:text-background dark:hover:text-foreground transition-colors"
              >
                {link.name}
              </a>
            ))}
          </div>
        ))}

        <div className="flex flex-col gap-3 min-w-26 text-sm sm:text-base whitespace-nowrap">
          <p className="text-background dark:text-foreground font-semibold mb-2 sm:mb-4">Socials</p>
          {socials.map((social) => (
            <a
              key={social.name}
              href={social.href}
              className="group flex items-center gap-2 transition-colors"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Icon svg={social.svg} className="size-4 sm:size-5 bg-muted-foreground group-hover:bg-background dark:group-hover:bg-foreground transition-colors" />
              <span className="text-muted-foreground font-light group-hover:text-background dark:group-hover:text-foreground transition-colors">{social.name}</span>
            </a>
          ))}
        </div>
      </div> */}

      <div className="flex items-center justify-center gap-4">
        <Link href="https://github.com/justtunya/crwsync">
          <div 
            className="size-6 bg-current" 
            style={{ 
              WebkitMaskImage: "url(/github.svg)", 
              maskImage: "url(/github.svg)", 
              WebkitMaskSize: 'contain', 
              maskSize: 'contain',
              WebkitMaskRepeat: 'no-repeat',
              maskRepeat: 'no-repeat',
              WebkitMaskPosition: 'center',
              maskPosition: 'center'
            }} 
          />
        </Link>

        <Link href="https://www.linkedin.com/in/lenard-tunya/">
          <div 
            className="size-8 bg-current" 
            style={{ 
              WebkitMaskImage: "url(/linkedin.svg)", 
              maskImage: "url(/linkedin.svg)", 
              WebkitMaskSize: 'contain', 
              maskSize: 'contain',
              WebkitMaskRepeat: 'no-repeat',
              maskRepeat: 'no-repeat',
              WebkitMaskPosition: 'center',
              maskPosition: 'center'
            }} 
          />
        </Link>
      </div>
    </footer>
  );
}