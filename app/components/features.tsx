"use client";

import { useRef, useEffect, useState } from "react";
import {
  Zap,
  Sparkles,
  Building2,
  Shield,
  Activity,
  Cpu,
} from "lucide-react";

interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  visual?: React.ReactNode;
  className?: string;
}

function FeatureCard({
  icon,
  title,
  description,
  visual,
  className = "",
}: FeatureCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    setMousePosition({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`group relative rounded-2xl border border-border bg-card/50 backdrop-blur-sm p-6 overflow-hidden transition-all duration-300 hover:border-primary/30 ${className}`}
    >
      {/* Cursor glow effect */}
      <div
        className="pointer-events-none absolute -inset-px opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        style={{
          background: isHovered
            ? `radial-gradient(400px circle at ${mousePosition.x}px ${mousePosition.y}px, rgba(255,95,0,0.15), transparent 40%)`
            : "none",
        }}
      />

      {/* Border glow */}
      <div
        className="pointer-events-none absolute -inset-px rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"
        style={{
          background: isHovered
            ? `radial-gradient(200px circle at ${mousePosition.x}px ${mousePosition.y}px, rgba(255,95,0,0.4), transparent 40%)`
            : "none",
          mask: "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
          maskComposite: "exclude",
          padding: "1px",
        }}
      />

      <div className="relative z-10">
        <div className="flex items-start justify-between mb-4">
          <div className="p-2 rounded-lg bg-primary/10 text-primary">{icon}</div>
          {visual}
        </div>
        <h3 className="text-lg font-semibold mb-2">{title}</h3>
        <p className="text-sm text-muted leading-relaxed">{description}</p>
      </div>
    </div>
  );
}

function LatencyIndicator() {
  const [latency, setLatency] = useState(0.3);

  useEffect(() => {
    const interval = setInterval(() => {
      setLatency(0.2 + Math.random() * 0.4);
    }, 1500);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex items-center gap-2">
      <div className="relative">
        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
        <div className="absolute inset-0 w-2 h-2 rounded-full bg-green-500 animate-ping opacity-75" />
      </div>
      <span className="font-mono text-xs text-muted-foreground">
        {latency.toFixed(1)}ms
      </span>
    </div>
  );
}

function AISparkle() {
  return (
    <div className="relative">
      <Sparkles className="w-5 h-5 text-primary animate-pulse" />
      <div className="absolute inset-0 blur-sm">
        <Sparkles className="w-5 h-5 text-primary opacity-50" />
      </div>
    </div>
  );
}

export function Features() {
  const sectionRef = useRef<HTMLElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        }
      },
      { threshold: 0.1 }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => observer.disconnect();
  }, []);

  const features = [
    {
      icon: <Zap className="w-5 h-5" />,
      title: "Real-Time Engine",
      description:
        "Powered by WebSockets & Redis Pub/Sub for sub-millisecond state updates across chat and Kanban modules.",
      visual: <LatencyIndicator />,
      className: "md:col-span-1",
    },
    {
      icon: <Cpu className="w-5 h-5" />,
      title: "AI Agentic Layer",
      description:
        "Integrated with Google Antigravity. Automated parsing of chat streams to generate intelligent project insights.",
      visual: <AISparkle />,
      className: "md:col-span-1",
    },
    {
      icon: <Building2 className="w-5 h-5" />,
      title: "Enterprise-Grade Architecture",
      description:
        "Decoupled Turborepo monorepo. Resilient background task processing via BullMQ for reliable operation at scale.",
      className: "md:col-span-1",
    },
    {
      icon: <Shield className="w-5 h-5" />,
      title: "Fortified Security",
      description:
        "Strict RBAC, short-lived JWTs, and secure HttpOnly cookie management to protect enterprise data.",
      className: "md:col-span-1",
    },
  ];

  return (
    <section
      ref={sectionRef}
      id="features"
      className="relative py-32 px-6 overflow-hidden"
    >
      {/* Background accent */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-radial from-primary/5 via-transparent to-transparent rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-6xl mx-auto">
        {/* Section header */}
        <div
          className={`text-center mb-16 transition-all duration-1000 ${
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          }`}
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-border bg-card/50 text-xs text-muted-foreground mb-4">
            <Activity className="w-3 h-3" />
            Core Capabilities
          </div>
          <h2 className="text-4xl md:text-5xl font-bold tracking-tight">
            Built for{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-orange-400">
              Scale
            </span>
          </h2>
          <p className="mt-4 text-muted max-w-2xl mx-auto">
            Every component engineered for high-throughput, low-latency
            distributed collaboration.
          </p>
        </div>

        {/* Bento grid */}
        <div
          className={`grid grid-cols-1 md:grid-cols-2 gap-4 transition-all duration-1000 delay-200 ${
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          }`}
        >
          {features.map((feature, index) => (
            <FeatureCard
              key={index}
              icon={feature.icon}
              title={feature.title}
              description={feature.description}
              visual={feature.visual}
              className={feature.className}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
