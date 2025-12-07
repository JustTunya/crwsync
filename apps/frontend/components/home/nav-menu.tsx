"use client"

import * as React from "react"
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

export function NavMenu() {
  const isMobile = useMobile()

  if (isMobile) {
    return null
  }

  return (
    <NavigationMenu>
      <NavigationMenuList className="flex-wrap gap-3 sm:gap-6">
        <NavigationMenuItem>
          <NavigationMenuTrigger>Product</NavigationMenuTrigger>
          <NavigationMenuContent>
            <ul className="flex flex-col gap-2">
              <ListItem href="/" title="Overview" className="whitespace-nowrap rounded-md hover:bg-primary/15">
                What is crwsync?
              </ListItem>
              <ListItem href="/modules" title="Modules" className="whitespace-nowrap rounded-md hover:bg-primary/15">
                What does crwsync include?
              </ListItem>
              <ListItem href="/solutions" title="Solutions" className="whitespace-nowrap rounded-md hover:bg-primary/15">
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
          <NavigationMenuLink asChild className={navigationMenuTriggerStyle()}>
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
      <NavigationMenuLink asChild>
        <Link href={href}>
          <div className="text-sm leading-none font-medium">{title}</div>
          <p className="text-muted-foreground line-clamp-2 text-sm leading-snug">
            {children}
          </p>
        </Link>
      </NavigationMenuLink>
    </li>
  )
}