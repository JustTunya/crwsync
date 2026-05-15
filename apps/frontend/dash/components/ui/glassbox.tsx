import { cn } from "@/lib/utils"

export function GlassBox({ children }: { children: React.ReactNode }) {
  return (
    <div className={cn(
      "flex flex-col justify-center items-center w-xs sm:w-lg mx-auto p-6",
      "bg-linear-to-br from-foreground/10 via-foreground/6 to-foreground/5 border-[1.5px] border-foreground/10 backdrop-blur-md backdrop-saturate-100 shadow-xl/5 rounded-2xl"
    )}>
      {children}
    </div>
  );
}