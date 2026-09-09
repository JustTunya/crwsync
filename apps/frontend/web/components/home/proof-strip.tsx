const stack = ["Next.js", "NestJS", "PostgreSQL", "Redis", "Socket.IO", "Prisma", "Docker"];

export default function ProofStrip() {
  return (
    <div className="flex flex-wrap items-center justify-center gap-3 px-6 py-6 max-w-4xl mx-auto text-xs sm:text-sm font-semibold text-muted-foreground tracking-wide">
      {stack.map((tech, i) => (
        <span key={tech} className="flex items-center gap-3">
          {i > 0 && <span className="size-1 rounded-full bg-muted-foreground/40" aria-hidden="true" />}
          {tech}
        </span>
      ))}
    </div>
  );
}
