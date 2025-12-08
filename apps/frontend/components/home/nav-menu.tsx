import Link from "next/link"
import { useMobile } from "@/hooks/use-mobile"
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
  navigationMenuTriggerStyle,
} from "@/components/ui/navigation-menu"
import { cn } from "@/lib/utils"

export function NavMenu() {
  const isMobile = useMobile()

  if (isMobile) {
    return null
  }

  return (
    <NavigationMenu>
      <NavigationMenuList className="flex items-center justify-center lg:gap-6">
        <NavigationMenuItem>
          <NavigationMenuTrigger>Product</NavigationMenuTrigger>
          <NavigationMenuContent>
            <ul className="flex flex-col gap-2">
              <ListItem href="#overview" title="Overview">
                What is crwsync?
              </ListItem>
              <ListItem href="/modules" title="Modules">
                What does crwsync include?
              </ListItem>
              <ListItem href="/solutions" title="Solutions">
                Who is crwsync for?
              </ListItem>
            </ul>
          </NavigationMenuContent>
        </NavigationMenuItem>
        <NavigationMenuItem>
          <NavigationMenuLink asChild className={navigationMenuTriggerStyle()}>
            <Link href="/roadmap">Roadmap</Link>
          </NavigationMenuLink>
        </NavigationMenuItem>
        <NavigationMenuItem>
          <NavigationMenuLink asChild className={navigationMenuTriggerStyle()}>
            <Link href="/changelog">Changelog</Link>
          </NavigationMenuLink>
        </NavigationMenuItem>
        <NavigationMenuItem>
          <NavigationMenuLink asChild className={cn(navigationMenuTriggerStyle(), "hidden lg:inline-flex")}>
            <Link href="/founder">Founder</Link>
          </NavigationMenuLink>
        </NavigationMenuItem>
      </NavigationMenuList>
    </NavigationMenu>
  )
}

function ListItem({
  title,
  children,
  href,
  ...props
}: React.ComponentPropsWithoutRef<"li"> & { href: string }) {
  return (
    <li {...props}>
      <NavigationMenuLink asChild className="group block p-3 rounded-md whitespace-nowrap hover:bg-primary/15 transition-colors">
        <Link href={href}>
          <div className="text-sm leading-none font-medium group-hover:text-primary">{title}</div>
          <p className="text-muted-foreground line-clamp-2 text-sm leading-snug group-hover:text-primary/60">
            {children}
          </p>
        </Link>
      </NavigationMenuLink>
    </li>
  )
}