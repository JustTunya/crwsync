import { cn } from "@/lib/utils";

interface SectionProps {
  id: string;
  title: string;
  lead: string;
  children: React.ReactNode;
  className?: string;
}

export function Section({ id, title, lead, children, className }: SectionProps) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className="border-b border-border scroll-mt-24">
      <div className={cn("mx-auto max-w-6xl px-4 sm:px-8 py-16 sm:py-24 lg:border-x lg:border-border", className)}>
        <div className="grid gap-4 lg:grid-cols-12 lg:gap-8 mb-10 sm:mb-14">
          <h2 id={`${id}-title`} className="lg:col-span-5 text-3xl sm:text-4xl font-bold tracking-tight leading-[1.1] text-balance">
            {title}
          </h2>
          <p className="lg:col-span-6 lg:col-start-7 max-w-[60ch] text-base sm:text-lg text-muted-foreground leading-normal text-pretty">
            {lead}
          </p>
        </div>
        {children}
      </div>
    </section>
  );
}
