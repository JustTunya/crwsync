import { cn } from "@/lib/utils"

export function GlassBox({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn(
      "relative flex flex-col justify-center gap-2",
      "w-full min-w-0 p-4",
      "bg-background/50 dark:bg-foreground/5 border border-background dark:border-foreground/10 backdrop-blur-md backdrop-saturate-100 inset-shadow-sm inset-shadow-background dark:inset-shadow-foreground/10 shadow-xl/5 rounded-xl",
      className
    )}>
      <div className="absolute inset-0 -z-10 w-full h-1/2 bg-linear-to-b from-background/50 dark:from-foreground/5 to-transparent rounded-t-[0.6rem]" />
      {children}
    </div>
  );
}