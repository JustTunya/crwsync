import { cn } from "@/lib/utils"

export function GlassBox({ children }: { children: React.ReactNode }) {
  return (
    <div className={cn(
      "relative flex flex-col justify-center items-center",
      "w-xs sm:w-lg mx-auto p-6",
      "bg-background/50 dark:bg-foreground/5 border border-background dark:border-foreground/10 backdrop-blur-md backdrop-saturate-100 inset-shadow-sm inset-shadow-background dark:inset-shadow-foreground/10 shadow-xl/5 rounded-xl"
    )}>
      <div className="absolute inset-0 -z-10 w-full h-1/2 bg-linear-to-b from-background/50 dark:from-foreground/10 to-transparent rounded-xl" />
      {children}
    </div>
  );
}