import { cn } from "@/lib/utils"

export function GlassBox({ children }: { children: React.ReactNode }) {
  return (
    <div className={cn(
      "flex flex-col justify-center items-center",
      "w-xs sm:w-lg mx-auto p-6 sm:p-8 m-12 sm:m-16",
      "bg-background/60 border-[1.5px] border-background backdrop-blur-xl shadow-xl/5 rounded-xl"
    )}>
      <div className="absolute bottom-0 -z-10 w-full h-2/3 bg-gradient-to-t from-background/30 to-background/0 rounded-xl" />
      {children}
    </div>
  );
}