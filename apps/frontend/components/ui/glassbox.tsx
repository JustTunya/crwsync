import dynamic from "next/dynamic";
export function GlassBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative sm:w-md max-w-[calc(100vw-4rem)] mx-auto p-6 sm:p-8 bg-base-200/50 backdrop-blur-md border border-base-100 shadow-xl/5 rounded-2xl">
      <div className="z-[-1] absolute inset-0 rounded-2xl shadow-[inset_0_8px_16px_8px_rgba(255,255,255,0.2),inset_0_-16px_24px_-16px_rgba(0,0,0,0.1)]" />
      {children}
    </div>
  );
}