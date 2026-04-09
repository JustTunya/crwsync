"use client";

import { motion } from "framer-motion";
import { useRef, useState, useEffect, useId } from "react";
import { HugeiconsIcon, IconSvgElement } from "@hugeicons/react";
import { ComputerPhoneSyncIcon, Globe02Icon, DashboardSquare01Icon, ServerStack03Icon, DatabaseIcon, Layers01Icon, Rocket01Icon, FavouriteIcon, Notification01Icon } from "@hugeicons/core-free-icons";

const clients = [
  { id: "browser", label: "Browser", desc: "crwsync.com", icon: ComputerPhoneSyncIcon },
  { id: "mobile", label: "Mobile", desc: "Future PWA / Native", icon: ComputerPhoneSyncIcon },
];

const infra = [
  { id: "cloudflare", label: "Cloudflare", tech: "DNS • TLS • CDN • DDoS", icon: "./cloudflare.svg" },
  { id: "nginx", label: "Nginx", tech: "Routing • SSL Termination", icon: "./nginx.svg" },
];

const frontend = [
  { id: "web", label: "Public Portal", tech: "Next.js", icon: Globe02Icon },
  { id: "dash", label: "Dashboard", tech: "Next.js", icon: DashboardSquare01Icon },
];

const data = [
  { id: "db", label: "Persistence", tech: "PostgreSQL", icon: DatabaseIcon },
  { id: "redis", label: "In-Memory", tech: "Redis Cache", icon: Layers01Icon },
];

export default function Architecture() {
  const projectRef = useRef<HTMLDivElement>(null);
  const infraRef = useRef<HTMLDivElement>(null);

  return (
    <section id="architecture" className="flex flex-col items-center gap-8 px-6 sm:px-12 py-12 row-span-1">
      <div className="flex items-center justify-center px-3 py-1.5 bg-background/15 dark:bg-linear-to-br from-foreground/20 via-foreground/12 to-foreground/10 border-[1.5px] border-foreground/20 backdrop-saturate-100 shadow-md shadow-black/5 rounded-full">
        <span className="text-balanced text-center text-sm text-muted-foreground tracking-wide leading-tighter">
          Architecture
        </span>
      </div>

      <div ref={projectRef} className="relative flex flex-col lg:flex-row items-center justify-between gap-26 lg:gap-8 w-full py-8">
        {/* Connectors */}
        <Connector delayOrder={0} from="card-browser" to="card-cloudflare" containerRef={projectRef} curve={0} />
        <Connector delayOrder={0.1} from="card-mobile" to="card-cloudflare" containerRef={projectRef} curve={0.9} />
        <Connector delayOrder={0.8} from="card-cloudflare" to="card-nginx" containerRef={projectRef} rightLoop curve={-1} />
        <Connector delayOrder={1.6} from="card-nginx" to="card-web" containerRef={projectRef} curve={0.9} />
        <Connector delayOrder={1.7} from="card-nginx" to="card-dash" containerRef={projectRef} curve={0} />
        <Connector delayOrder={2.4} from="card-web" to="card-backend" label="REST" containerRef={projectRef} curve={0} />
        <Connector delayOrder={2.5} from="card-dash" to="card-backend" label="REST" containerRef={projectRef} curve={0} />
        <Connector delayOrder={0} from="card-dash" to="card-backend" label="WS" containerRef={projectRef} curve={0} dashed offsetX={-16} offsetY={8} />
        <Connector delayOrder={3.2} from="card-backend" to="card-db" label="Prisma ORM" containerRef={projectRef} curve={0} />
        <Connector delayOrder={3.3} from="card-backend" to="card-redis" label="R/W" containerRef={projectRef} curve={0} />

        <div className="relative flex lg:flex-col gap-4 p-4 border-[1.5px] border-dashed border-muted-foreground/30 rounded-4xl z-10">
          <div className="absolute inset-x-0 -top-2.75 text-balanced text-center text-sm text-muted-foreground tracking-wide leading-tighter">
            <span className="px-1 bg-background">Clients</span>
          </div>
          {clients.map((node, i) => (
            <Card key={node.id} id={`card-${node.id}`} i={i} icon={node.icon} label={node.label} desc={node.desc} />
          ))}
        </div>

        <div className="relative flex lg:flex-col gap-4 p-4 border-[1.5px] border-dashed border-muted-foreground/30 rounded-4xl z-10">
          <div className="absolute inset-x-0 -top-2.75 text-balanced text-center text-sm text-muted-foreground tracking-wide leading-tighter">
            <span className="px-1 bg-background">Infrastructure</span>
          </div>
          {infra.map((node, i) => (
            <Card key={node.id} id={`card-${node.id}`} i={i + clients.length} icon={node.icon} label={node.label} tech={node.tech} />
          ))}
        </div>

        <div className="relative flex lg:flex-col gap-4 p-4 border-[1.5px] border-dashed border-muted-foreground/30 rounded-4xl z-10">
          <div className="absolute inset-x-0 -top-2.75 text-balanced text-center text-sm text-muted-foreground tracking-wide leading-tighter">
            <span className="px-1 bg-background">Frontend</span>
          </div>
          {frontend.map((node, i) => (
            <Card key={node.id} id={`card-${node.id}`} i={i + clients.length + infra.length} icon={node.icon} label={node.label} tech={node.tech} />
          ))}
        </div>

        <Card key="backend" id="card-backend" i={1 + clients.length + infra.length + frontend.length} icon={ServerStack03Icon} label="Backend" tech="NestJS • JWT Auth • REST • Socket.IO • Prisma ORM" />

        <div className="relative flex lg:flex-col gap-4 p-4 border-[1.5px] border-dashed border-muted-foreground/30 rounded-4xl z-10">
          <div className="absolute inset-x-0 -top-2.75 text-balanced text-center text-sm text-muted-foreground tracking-wide leading-tighter">
            <span className="px-1 bg-background">Data Management</span>
          </div>
          {data.map((node, i) => (
            <Card key={node.id} id={`card-${node.id}`} i={i + clients.length + infra.length + frontend.length + 1} icon={node.icon} label={node.label} tech={node.tech} />
          ))}
        </div>
      </div>

      <div ref={infraRef} className="relative flex flex-col lg:flex-row items-center justify-around gap-16 lg:gap-8 max-w-4xl w-full py-8">
        <Connector delayOrder={0} from="card-git" to="card-lint" containerRef={infraRef} curve={0.9} rightLoop offsetX={6} />
        <Connector delayOrder={0.8} from="card-lint" to="card-test" label="Pass" containerRef={infraRef} curve={0.9} offsetX={120} />
        <Connector delayOrder={1.6} from="card-test" to="card-build" label="Pass" containerRef={infraRef} curve={0.9} />
        <Connector delayOrder={2.4} from="card-build" to="card-ghcr" label="Push" containerRef={infraRef} curve={0.9} rightLoop offsetX={6} />
        <Connector delayOrder={3.2} from="card-ghcr" to="card-deploy" label="Pull" containerRef={infraRef} curve={0.9} offsetX={120} />
        <Connector delayOrder={4} from="card-deploy" to="card-health" label="Verify" containerRef={infraRef} curve={0.9} />
        <Connector delayOrder={4.8} from="card-health" to="card-notify" containerRef={infraRef} curve={0.9} rightLoop offsetX={6} />
        <Connector delayOrder={0} from="card-health" to="card-build" label="Rollback" containerRef={infraRef} curve={0.3} rightLoop dashed />
        
        <div className="relative flex flex-col gap-4 p-4 border-[1.5px] border-dashed border-muted-foreground/30 rounded-4xl z-10">
          <div className="absolute inset-x-0 -top-2.75 text-balanced text-center text-sm text-muted-foreground tracking-wide leading-tighter">
            <span className="px-1 bg-background">CI Phase</span>
          </div>

          <Card key="git" id="card-git" i={1 + frontend.length + data.length} icon="./github.svg" label="Git Push & Merge" desc="Pushing changes to the main branch triggers the pipeline." />
          <Card key="lint" id="card-lint" i={1 + frontend.length + data.length} icon="./eslint.svg" label="Lint" desc="Linting each package." />
          <Card key="test" id="card-test" i={1 + frontend.length + data.length} icon="./jest.svg" label="Unit Test" desc="Running unit tests for each package." />
        </div>

        <div className="relative flex flex-col gap-4 p-4 border-[1.5px] border-dashed border-muted-foreground/30 rounded-4xl z-10">
          <div className="absolute inset-x-0 -top-2.75 text-balanced text-center text-sm text-muted-foreground tracking-wide leading-tighter">
            <span className="px-1 bg-background">CD Phase</span>
          </div>

          <Card key="build" id="card-build" i={1 + frontend.length + data.length} icon="./docker.svg" label="Docker Build" desc="Container images are built." />
          <Card key="ghcr" id="card-ghcr" i={1 + frontend.length + data.length} icon="./github.svg" label="Container Registry" desc="Container images are pushed to the GitHub Container Registry." />
          <Card key="deploy" id="card-deploy" i={1 + frontend.length + data.length} icon={Rocket01Icon} fillIcon label="Deploy" desc="Images are deployed to the server." />
        </div>

        <div className="relative flex flex-col gap-4">
          <Card key="health" id="card-health" i={1 + frontend.length + data.length} icon={FavouriteIcon} fillIcon label="Health Check" desc="Health check is performed to ensure the services are running." />
          <Card key="notify" id="card-notify" i={1 + frontend.length + data.length} icon={Notification01Icon} fillIcon label="Notify" desc="Notify users about the deployment." />
        </div>
      </div>
    </section>
  );
}

function Card({
  id,
  i,
  icon,
  label,
  tech,
  desc,
  fillIcon,
  children
}: {
  id?: string;
  i: number;
  icon: IconSvgElement | string;
  label: string;
  tech?: string;
  desc?: string;
  fillIcon?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <motion.div
      id={id}
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay: i * 0.15 }}
      className="flex flex-col items-center justify-center min-h-24 lg:min-h-26 h-full w-30 lg:w-40 p-2 text-center rounded-2xl shadow-xl border-[1.5px] border-foreground/10 bg-linear-to-br from-foreground/10 via-foreground/6 to-foreground/5 backdrop-blur-md"
    >
      <div className="p-2 mb-2 bg-foreground/10 text-foreground rounded-full">
        {typeof icon === "string" ? (
          <div 
            className="size-6 bg-current" 
            style={{ 
              WebkitMaskImage: `url(${icon})`, 
              maskImage: `url(${icon})`, 
              WebkitMaskSize: 'contain', 
              maskSize: 'contain',
              WebkitMaskRepeat: 'no-repeat',
              maskRepeat: 'no-repeat',
              WebkitMaskPosition: 'center',
              maskPosition: 'center'
            }} 
          />
        ) : (
          <HugeiconsIcon icon={icon} strokeWidth={1.5} fill={fillIcon ? "currentColor" : "none"} className="text-xs" />
        )}
      </div>
      <span className="text-xs font-semibold text-foreground leading-relaxed line-clamp-1">
        {label}
      </span>
      {tech && (
        <span className="text-[11px] text-muted-foreground text-balance tracking-tight leading-tight line-clamp-2">
          {tech}
        </span>
      )}
      {desc && (
        <span className="text-[11px] text-muted-foreground text-balance tracking-tight leading-tight line-clamp-2">
          {desc}
        </span>
      )}
      {children}
    </motion.div>
  );
}

function Connector({
  from,
  to,
  dashed = false,
  curve = 0.5,
  containerRef,
  offsetX = 0,
  offsetY = 0,
  delayOrder = 0,
  rightLoop = false,
  label
}: {
  from: string;
  to: string;
  dashed?: boolean;
  curve?: number;
  containerRef: React.RefObject<HTMLElement | null>;
  offsetX?: number;
  offsetY?: number;
  delayOrder?: number;
  rightLoop?: boolean;
  label?: string;
}) {
  const [coords, setCoords] = useState<{ x1: number; y1: number; x2: number; y2: number } | null>(null);
  const rawId = useId();
  const pathId = "path-" + rawId.replace(/:/g, "");

  useEffect(() => {
    let animationFrameId: number;
    let lastState = "";

    const update = () => {
      if (!containerRef.current) {
        animationFrameId = requestAnimationFrame(update);
        return;
      }
      const parent = containerRef.current.getBoundingClientRect();
      const el1 = document.getElementById(from);
      const el2 = document.getElementById(to);
      if (!el1 || !el2) {
        animationFrameId = requestAnimationFrame(update);
        return;
      }

      const r1 = el1.getBoundingClientRect();
      const r2 = el2.getBoundingClientRect();

      const x1 = r1.left + r1.width / 2 - parent.left;
      const y1 = r1.top + r1.height / 2 - parent.top;
      const x2 = r2.left + r2.width / 2 - parent.left;
      const y2 = r2.top + r2.height / 2 - parent.top;

      const state = `${x1},${y1},${x2},${y2}`;
      if (state !== lastState) {
        lastState = state;
        setCoords({ x1: x1, y1: y1 + offsetY, x2: x2, y2: y2 + offsetY });
      }

      animationFrameId = requestAnimationFrame(update);
    };

    update();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [from, to, containerRef, offsetX, offsetY]);

  if (!coords) return null;

  const { x1, y1, x2, y2 } = coords;
  const deltaX = Math.abs(x2 - x1);
  const deltaY = Math.abs(y2 - y1);
  const h = rightLoop ? deltaY * curve : deltaX * curve;
  const data = rightLoop 
    ? `M ${x1} ${y1} C ${x1 + h + offsetX} ${y1}, ${x2 + h + offsetX} ${y2}, ${x2} ${y2}`
    : `M ${x1} ${y1} C ${x1 + h - offsetX} ${y1}, ${x2 - h - offsetX} ${y2}, ${x2} ${y2}`;

  const beamDuration = 2;
  const initialDelay = (delayOrder || 0) * beamDuration;
  const repeatDelay = beamDuration;
  
  return (
    <svg className="absolute top-0 left-0 w-full h-full pointer-events-none">
      {label && <path id={pathId} d={data} fill="none" stroke="none" />}
      {/* Background static line */}
      <motion.path
        d={data}
        fill="none"
        stroke="var(--muted-foreground)"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeDasharray={dashed ? "5 5" : undefined}
        initial={dashed ? { strokeDashoffset: 0 } : undefined}
        animate={dashed ? { strokeDashoffset: -10 } : {}}
        transition={dashed ? { repeat: Infinity, duration: 0.4, ease: "linear" } : {}}
      />
      
      {/* Animated Light Beam for non-dashed lines */}
      {!dashed && (
        <>
          {/* Faded edges tail */}
          <motion.path
            d={data}
            fill="none"
            stroke="var(--primary)"
            strokeWidth="4"
            strokeLinecap="round"
            strokeOpacity={0.2}
            initial={{ pathLength: 0.2, pathOffset: -0.2 }}
            animate={{ pathOffset: 1 }}
            transition={{ repeat: Infinity, duration: beamDuration, delay: initialDelay, repeatDelay, ease: "linear" }}
          />
          {/* Core bright beam with glow */}
          <motion.path
            d={data}
            fill="none"
            stroke="var(--primary)"
            strokeWidth="2"
            strokeLinecap="round"
            style={{ filter: "drop-shadow(0 0 8px var(--primary))" }}
            initial={{ pathLength: 0.1, pathOffset: -0.15 }}
            animate={{ pathOffset: 1.05 }}
            transition={{ repeat: Infinity, duration: beamDuration, delay: initialDelay, repeatDelay, ease: "linear" }}
          />
        </>
      )}

      {label && (
        <text className="text-[10px] font-medium fill-muted-foreground" dy="-2">
          <textPath href={`#${pathId}`} startOffset="50%" textAnchor="middle">
            {label}
          </textPath>
        </text>
      )}
    </svg>
  );
}