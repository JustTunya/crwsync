"use client";

import { useEffect, useRef, useState } from "react";
import { m, useInView } from "framer-motion";
import { HugeiconsIcon, IconSvgElement } from "@hugeicons/react";
import {
  ComputerPhoneSyncIcon,
  Globe02Icon,
  DashboardSquare01Icon,
  ServerStack03Icon,
  DatabaseIcon,
  Layers01Icon,
  Folder01Icon,
  Rocket01Icon,
  FavouriteIcon,
  Notification01Icon,
  Task01Icon,
} from "@hugeicons/core-free-icons";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";
import { Section } from "@/components/home/section";
import { cn } from "@/lib/utils";

interface Node {
  id: string;
  label: string;
  detail: string;
  icon: IconSvgElement | string;
  fillIcon?: boolean;
}

interface Group {
  label: string;
  nodes: Node[];
}

interface Edge {
  from: string;
  to: string;
  label?: string;
  dashed?: boolean;
  delay: number;
  offset?: number;
}

const runtimeGroups: Group[] = [
  {
    label: "Clients",
    nodes: [
      { id: "browser", label: "Browser", detail: "crwsync.xyz", icon: ComputerPhoneSyncIcon },
      { id: "mobile", label: "Mobile", detail: "Future PWA", icon: ComputerPhoneSyncIcon },
    ],
  },
  {
    label: "Edge",
    nodes: [
      { id: "cloudflare", label: "Cloudflare", detail: "DNS, TLS, CDN, DDoS", icon: "./cloudflare.svg" },
      { id: "nginx", label: "Nginx", detail: "Routing per subdomain", icon: "./nginx.svg" },
    ],
  },
  {
    label: "Frontend",
    nodes: [
      { id: "web", label: "Public portal", detail: "Next.js 16", icon: Globe02Icon },
      { id: "dash", label: "Dashboard", detail: "Next.js 16", icon: DashboardSquare01Icon },
    ],
  },
  {
    label: "Backend",
    nodes: [
      { id: "api", label: "API", detail: "NestJS, REST, Socket.IO", icon: ServerStack03Icon },
      { id: "workers", label: "Workers", detail: "BullMQ: email, chat persistence", icon: Task01Icon },
    ],
  },
  {
    label: "Data & storage",
    nodes: [
      { id: "postgres", label: "Postgres", detail: "Prisma, source of truth", icon: DatabaseIcon },
      { id: "redis", label: "Redis", detail: "Cache, locks, queues, pub/sub", icon: Layers01Icon },
      { id: "storage", label: "Object storage", detail: "R2 in prod, MinIO locally", icon: Folder01Icon },
    ],
  },
];

const runtimeEdges: Edge[] = [
  { from: "browser", to: "cloudflare", delay: 0 },
  { from: "mobile", to: "cloudflare", delay: 0.1 },
  { from: "cloudflare", to: "nginx", delay: 0.8 },
  { from: "nginx", to: "web", delay: 1.6 },
  { from: "nginx", to: "dash", delay: 1.7 },
  { from: "web", to: "api", label: "REST", delay: 2.4 },
  { from: "dash", to: "api", label: "REST", delay: 2.5, offset: -7 },
  { from: "dash", to: "api", label: "WS", delay: 0, dashed: true, offset: 9 },
  { from: "api", to: "postgres", label: "Prisma", delay: 3.2 },
  { from: "api", to: "redis", label: "cache", delay: 3.3 },
  { from: "api", to: "storage", label: "presign", delay: 3.4 },
  { from: "api", to: "workers", label: "enqueue", delay: 0, dashed: true },
  { from: "workers", to: "postgres", delay: 4.2 },
];

const pipelineGroups: Group[] = [
  {
    label: "CI",
    nodes: [
      { id: "git", label: "Push to main", detail: "Triggers the pipeline", icon: "./github.svg" },
      { id: "lint", label: "Lint", detail: "Every package", icon: "./eslint.svg" },
      { id: "test", label: "Unit tests", detail: "Every package", icon: "./jest.svg" },
    ],
  },
  {
    label: "CD",
    nodes: [
      { id: "build", label: "Docker build", detail: "One image per service", icon: "./docker.svg" },
      { id: "ghcr", label: "Registry", detail: "Pushed to GHCR", icon: "./github.svg" },
      { id: "deploy", label: "Deploy", detail: "Swarm rolling update", icon: Rocket01Icon, fillIcon: true },
    ],
  },
  {
    label: "Verify",
    nodes: [
      { id: "health", label: "Health check", detail: "Every service answers", icon: FavouriteIcon, fillIcon: true },
      { id: "notify", label: "Notify", detail: "Deployment result", icon: Notification01Icon, fillIcon: true },
    ],
  },
];

const pipelineEdges: Edge[] = [
  { from: "git", to: "lint", delay: 0 },
  { from: "lint", to: "test", label: "pass", delay: 0.8 },
  { from: "test", to: "build", label: "pass", delay: 1.6 },
  { from: "build", to: "ghcr", label: "push", delay: 2.4 },
  { from: "ghcr", to: "deploy", label: "pull", delay: 3.2 },
  { from: "deploy", to: "health", label: "verify", delay: 4 },
  { from: "health", to: "notify", delay: 4.8 },
  { from: "health", to: "build", label: "rollback", delay: 0, dashed: true, offset: 14 },
];

export default function Architecture() {
  return (
    <Section
      id="architecture"
      title="Three services, one domain, no shared memory"
      lead="Public traffic, authenticated traffic, and the API run as separate deployables behind Cloudflare and Nginx. The beam follows a request from a browser to the data layer. Dashed lines are the asynchronous paths: sockets, queues, and rollbacks."
    >
      <Diagram groups={runtimeGroups} edges={runtimeEdges} />

      <div className="mt-20 grid gap-4 border-t border-border pt-12 lg:grid-cols-12 lg:gap-8">
        <h3 className="lg:col-span-5 text-2xl sm:text-3xl font-bold tracking-tight leading-[1.1] text-balance">From push to production</h3>
        <p className="lg:col-span-6 lg:col-start-7 max-w-[60ch] text-base text-muted-foreground text-pretty">
          A merge to main lints and tests every package, builds one container image per service, pushes them to the registry, and rolls them onto the Swarm start-first. A failed health check rolls back to the previous image.
        </p>
      </div>

      <Diagram groups={pipelineGroups} edges={pipelineEdges} className="mx-auto max-w-4xl" />
    </Section>
  );
}

interface EdgeGeometry {
  edge: Edge;
  d: string;
  mid: { x: number; y: number };
}

function edgeGeometry(edge: Edge, a: DOMRect, b: DOMRect, parent: DOMRect): EdgeGeometry {
  const offset = edge.offset ?? 0;
  const hGap = Math.max(b.left - a.right, a.left - b.right);
  const vGap = Math.max(b.top - a.bottom, a.top - b.bottom);
  const horizontal = hGap >= vGap;

  let x1: number, y1: number, x2: number, y2: number;
  if (horizontal) {
    const rightward = b.left >= a.right;
    x1 = rightward ? a.right : a.left;
    x2 = rightward ? b.left : b.right;
    y1 = a.top + a.height / 2 + offset;
    y2 = b.top + b.height / 2 + offset;
  } else {
    const downward = b.top >= a.bottom;
    y1 = downward ? a.bottom : a.top;
    y2 = downward ? b.top : b.bottom;
    x1 = a.left + a.width / 2 + offset;
    x2 = b.left + b.width / 2 + offset;
  }

  x1 = Math.round(x1 - parent.left);
  x2 = Math.round(x2 - parent.left);
  y1 = Math.round(y1 - parent.top);
  y2 = Math.round(y2 - parent.top);

  const span = horizontal ? x2 - x1 : y2 - y1;
  const pull = Math.max(24, Math.abs(span) / 2) * Math.sign(span || 1);
  const c1 = horizontal ? [x1 + pull, y1] : [x1, y1 + pull];
  const c2 = horizontal ? [x2 - pull, y2] : [x2, y2 - pull];

  return {
    edge,
    d: `M ${x1} ${y1} C ${c1[0]} ${c1[1]}, ${c2[0]} ${c2[1]}, ${x2} ${y2}`,
    mid: {
      x: 0.125 * x1 + 0.375 * c1[0] + 0.375 * c2[0] + 0.125 * x2,
      y: 0.125 * y1 + 0.375 * c1[1] + 0.375 * c2[1] + 0.125 * y2,
    },
  };
}

function Diagram({ groups, edges, className }: { groups: Group[]; edges: Edge[]; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { amount: 0.1 });
  const reducedMotion = usePrefersReducedMotion();
  const [geometry, setGeometry] = useState<EdgeGeometry[]>([]);

  useEffect(() => {
    if (!inView) return;
    let frame = 0;
    let last = "";
    const tick = () => {
      const root = ref.current;
      if (root) {
        const parent = root.getBoundingClientRect();
        const next = edges.flatMap((edge) => {
          const a = root.querySelector<HTMLElement>(`[data-node="${edge.from}"]`);
          const b = root.querySelector<HTMLElement>(`[data-node="${edge.to}"]`);
          return a && b ? [edgeGeometry(edge, a.getBoundingClientRect(), b.getBoundingClientRect(), parent)] : [];
        });
        const key = next.map((g) => g.d).join("|");
        if (key !== last) {
          last = key;
          setGeometry(next);
        }
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [inView, edges]);

  return (
    <div ref={ref} className={cn("relative flex flex-col gap-10 py-6 lg:flex-row lg:items-center lg:justify-between lg:gap-6", className)}>
      <svg className="pointer-events-none absolute inset-0 h-full w-full overflow-visible" aria-hidden>
        {geometry.map((g) => (
          <Beam key={`${g.edge.from}-${g.edge.to}-${g.edge.label ?? ""}`} geometry={g} animate={!reducedMotion} />
        ))}
      </svg>

      {groups.map((group, gi) => (
        <div key={group.label} className="relative rounded-xl border border-border p-4 pt-6">
          <span className="absolute -top-2.5 left-3 rounded-full border border-border bg-background px-2 py-px text-[11px] font-semibold text-muted-foreground">
            {group.label}
          </span>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:flex lg:flex-col">
            {group.nodes.map((node, ni) => (
              <Card key={node.id} node={node} order={gi * 2 + ni} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

const BEAM_SECONDS = 2;

function Beam({ geometry, animate }: { geometry: EdgeGeometry; animate: boolean }) {
  const { edge } = geometry;
  const delay = edge.delay * BEAM_SECONDS;
  return (
    <g>
      <m.path
        d={geometry.d}
        fill="none"
        stroke="var(--border)"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeDasharray={edge.dashed ? "4 5" : undefined}
        animate={edge.dashed && animate ? { strokeDashoffset: [0, -9] } : undefined}
        transition={edge.dashed && animate ? { repeat: Infinity, duration: 0.6, ease: "linear" } : undefined}
      />
      {!edge.dashed && animate && (
        <>
          <m.path
            d={geometry.d}
            fill="none"
            stroke="var(--primary)"
            strokeWidth="4"
            strokeLinecap="round"
            strokeOpacity={0.2}
            initial={{ pathLength: 0.2, pathOffset: -0.2 }}
            animate={{ pathOffset: 1 }}
            transition={{ repeat: Infinity, duration: BEAM_SECONDS, delay, repeatDelay: BEAM_SECONDS, ease: "linear" }}
          />
          <m.path
            d={geometry.d}
            fill="none"
            stroke="var(--primary)"
            strokeWidth="2"
            strokeLinecap="round"
            style={{ filter: "drop-shadow(0 0 6px var(--primary))" }}
            initial={{ pathLength: 0.1, pathOffset: -0.15 }}
            animate={{ pathOffset: 1.05 }}
            transition={{ repeat: Infinity, duration: BEAM_SECONDS, delay, repeatDelay: BEAM_SECONDS, ease: "linear" }}
          />
        </>
      )}
      {edge.label && (
        <text
          x={geometry.mid.x}
          y={geometry.mid.y}
          textAnchor="middle"
          dominantBaseline="middle"
          paintOrder="stroke"
          stroke="var(--background)"
          strokeWidth={4}
          strokeLinejoin="round"
          className="fill-muted-foreground text-[10px] font-semibold"
        >
          {edge.label}
        </text>
      )}
    </g>
  );
}

function Card({ node, order }: { node: Node; order: number }) {
  const reducedMotion = usePrefersReducedMotion();

  return (
    <m.div
      data-node={node.id}
      initial={reducedMotion ? false : { opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: reducedMotion ? 0 : 0.45, delay: reducedMotion ? 0 : order * 0.08 }}
      className="relative z-10 flex min-h-24 w-full flex-col items-center justify-center gap-1.5 rounded-xl border border-border bg-card p-2.5 text-center shadow-sm lg:w-36"
    >
      <span className="flex size-8 items-center justify-center rounded-full bg-foreground/8 text-foreground">
        {typeof node.icon === "string" ? (
          <span
            className="size-4 bg-current"
            style={{
              WebkitMaskImage: `url(${node.icon})`,
              maskImage: `url(${node.icon})`,
              WebkitMaskSize: "contain",
              maskSize: "contain",
              WebkitMaskRepeat: "no-repeat",
              maskRepeat: "no-repeat",
              WebkitMaskPosition: "center",
              maskPosition: "center",
            }}
          />
        ) : (
          <HugeiconsIcon icon={node.icon} strokeWidth={1.75} fill={node.fillIcon ? "currentColor" : "none"} className="size-4" />
        )}
      </span>
      <span className="text-xs font-semibold leading-tight text-foreground">{node.label}</span>
      <span className="text-[10px] leading-tight text-muted-foreground text-balance">{node.detail}</span>
    </m.div>
  );
}
