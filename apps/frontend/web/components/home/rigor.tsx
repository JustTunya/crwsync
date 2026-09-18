const cells = [
  {
    title: "Sessions that expire on purpose",
    body: "Access tokens live 15 minutes in an HTTP-only, SameSite cookie scoped to the root domain, so a sign-in on the portal is valid on the dashboard subdomain. Refresh tokens rotate, passwords are bcrypt-hashed, and a cron job purges expired sessions every hour.",
    evidence: "@Cron(CronExpression.EVERY_HOUR)",
  },
  {
    title: "Authorization as a guard stack",
    body: "Routes declare who may call them. Membership and role guards run before the handler, and services assume the request already passed. No role checks are buried in business logic.",
    evidence: "@RequireWorkspaceRoles(OWNER, ADMIN)",
  },
  {
    title: "Rate limits tuned per route",
    body: "Ten sign-ins per five minutes, five workspaces an hour, fifty invites an hour, twenty searches per ten seconds. Cheap idempotent reads skip the throttle entirely instead of sharing one global budget.",
    evidence: "@Throttle({ default: { ttl: 10_000, limit: 20 } })",
  },
  {
    title: "Cache with explicit lifetimes",
    body: "Per-request lookups such as sessions, users, and workspace membership come from Redis with fixed TTLs. Every mutation invalidates the exact keys it touched. There is no blanket flush anywhere.",
    evidence: "CacheKeys.workspaceMember(workspaceId, userId)",
  },
  {
    title: "Input rejected at the door",
    body: "One global validation pipe strips unknown fields and rejects requests that send them. Helmet, compression, a ten-second timeout, and a single exception filter are wired once in the bootstrap, not per controller.",
    evidence: "new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true })",
  },
  {
    title: "Side effects leave the request",
    body: "Email delivery and message persistence run as BullMQ jobs on Redis. A slow SMTP server or a busy database never holds a response hostage.",
    evidence: "@Processor(\"email\")  @Processor(\"chat_messages\")",
  },
  {
    title: "Built to run more than one copy",
    body: "Socket.IO uses the Redis adapter, so any API instance can deliver an event that another one produced. Nothing in a gateway's memory is treated as the truth.",
    evidence: "new RedisIoAdapter(app, config)",
  },
  {
    title: "Deployed like a service, tested like one",
    body: "A Docker Swarm stack with start-first rolling updates and per-service CPU and memory limits. Thirty-three backend spec files cover guards, services, and gateways. The API refuses to boot without its CORS origin and JWT secrets.",
    evidence: "update_config: { order: start-first }",
  },
];

export function Rigor() {
  return (
    <dl className="grid grid-cols-1 gap-px overflow-hidden rounded-xl border border-border bg-border sm:grid-cols-2 lg:grid-cols-4">
      {cells.map((cell) => (
        <div key={cell.title} className="flex flex-col gap-3 bg-background p-5">
          <dt className="text-sm font-semibold leading-snug text-balance">{cell.title}</dt>
          <dd className="flex-1 text-sm text-muted-foreground leading-normal">{cell.body}</dd>
          <dd className="rounded-md border border-border bg-card px-2 py-1.5 font-mono text-[11px] leading-snug text-foreground/80 break-words">
            {cell.evidence}
          </dd>
        </div>
      ))}
    </dl>
  );
}
