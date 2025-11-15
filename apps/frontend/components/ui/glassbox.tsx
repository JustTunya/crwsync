import { cn } from "@/lib/utils"

export function GlassBox({ children }: { children: React.ReactNode }) {
  return (
    <div className={cn(
      "flex flex-col justify-center items-center",
      "w-xs sm:w-lg mx-auto p-6 sm:p-8 m-12 sm:m-16",
      "bg-base-100/75 backdrop-blur-md border border-base-200 shadow-xl/5 rounded-xl"
      )}>
      {children}
    </div>
  );
}