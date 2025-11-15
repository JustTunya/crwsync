import { cn } from "@/lib/utils"

export function GlassBox({ children }: { children: React.ReactNode }) {
  return (
    <div className={cn(
      "flex flex-col justify-center items-center",
      "w-xs sm:w-lg mx-auto p-6 sm:p-8 m-12 sm:m-16",
      "bg-background/50 border-[1.5px] border-background backdrop-blur-md shadow-xl/5 rounded-xl"
    )}>
      <div className="absolute bottom-0 -z-10 w-full h-1/2 bg-gradient-to-t from-background/25 to-background/0 rounded-xl" />
      {children}
    </div>
  );
}