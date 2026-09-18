const services = [
  { name: "Public portal", host: "crwsync.xyz", stack: "Next.js 16", note: "Marketing, sign-up, sign-in. No authenticated traffic shares its runtime." },
  { name: "Dashboard", host: "dash.crwsync.xyz", stack: "Next.js 16", note: "Boards, chat, files, schedules. Sessions carry over from the portal on a scoped cookie." },
  { name: "API", host: "api", stack: "NestJS 11", note: "REST plus a Socket.IO gateway, BullMQ workers, guards and pipes wired globally." },
  { name: "Data", host: "postgres, redis", stack: "Prisma 7", note: "Postgres is the source of truth. Redis carries cache, locks, queues, and socket fan-out." },
];

export function Topology() {
  return (
    <div className="border-b border-border">
      <dl className="mx-auto grid max-w-6xl grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 lg:border-x lg:border-border">
        {services.map((service, i) => (
          <div
            key={service.name}
            className={[
              "px-4 sm:px-6 py-5 border-border",
              i === 1 && "border-t sm:border-t-0",
              i >= 2 && "border-t lg:border-t-0",
              i % 2 === 1 && "sm:border-l",
              i > 0 && "lg:border-l",
            ]
              .filter(Boolean)
              .join(" ")}
          >
            <dt className="flex items-baseline justify-between gap-3">
              <span className="text-sm font-semibold">{service.name}</span>
              <span className="text-xs text-muted-foreground">{service.stack}</span>
            </dt>
            <dd className="mt-1 text-xs font-semibold text-primary">{service.host}</dd>
            <dd className="mt-2 text-sm text-muted-foreground leading-snug">{service.note}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
