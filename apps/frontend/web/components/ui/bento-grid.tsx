import { type ComponentPropsWithoutRef, type ReactNode } from "react"

import { cn } from "@/lib/utils"

interface BentoGridProps extends ComponentPropsWithoutRef<"div"> {
  children: ReactNode
  className?: string
}

interface BentoCardProps extends ComponentPropsWithoutRef<"div"> {
  name: string
  className: string
  description: string
  background?: ReactNode
}

const BentoGrid = ({ children, className, ...props }: BentoGridProps) => {
  return (
    <div
      className={cn(
        "grid w-full auto-rows-[10rem] grid-cols-3 gap-4",
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

const BentoCard = ({
  name,
  className,
  description,
  background,
  ...props
}: BentoCardProps) => (
  <div
    key={name}
    className={cn(
      "group relative col-span-3 flex flex-col justify-between overflow-hidden rounded-xl",
      "bg-linear-to-br from-foreground/10 via-foreground/6 to-foreground/5 border-[1.5px] border-foreground/10 backdrop-saturate-100 shadow-md shadow-black/5",
      className
    )}
    {...props}
  >
    <div>
      <div className="absolute size-full bg-[radial-gradient(color-mix(in_srgb,var(--muted-foreground)_30%,transparent)_1px,transparent_1px)] bg-size-[16px_16px] mask-[radial-gradient(ellipse_50%_50%_at_50%_50%,#000_10%,transparent_100%)]" />
      {background}
    </div>
    <div className="p-4">
      <div className="pointer-events-none z-10 flex transform-gpu flex-col gap-1">
        <h3 className="text-xl font-semibold text-foreground">
          {name}
        </h3>
        <p className="max-w-lg text-muted-foreground line-clamp-2">{description}</p>
      </div>
    </div>

    <div className="pointer-events-none absolute inset-0 transform-gpu" />
  </div>
)

export { BentoCard, BentoGrid }
