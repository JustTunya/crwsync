"use client";

import { useRef, useEffect, useState } from "react";
import { GitBranch, Database, Server, Cpu, Radio, Lock } from "lucide-react";

export function Architecture() {
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

  const architectureNodes = [
    {
      icon: <Server className="w-5 h-5" />,
      title: "NestJS Backend",
      description: "Modular, scalable API layer",
    },
    {
      icon: <Radio className="w-5 h-5" />,
      title: "WebSocket Gateway",
      description: "Real-time bidirectional communication",
    },
    {
      icon: <Database className="w-5 h-5" />,
      title: "PostgreSQL + Prisma",
      description: "Type-safe database operations",
    },
    {
      icon: <Cpu className="w-5 h-5" />,
      title: "Redis Pub/Sub",
      description: "Sub-millisecond message broadcasting",
    },
    {
      icon: <GitBranch className="w-5 h-5" />,
      title: "BullMQ Workers",
      description: "Resilient background processing",
    },
    {
      icon: <Lock className="w-5 h-5" />,
      title: "JWT + RBAC",
      description: "Enterprise security layer",
    },
  ];

  return (
    <section
      ref={sectionRef}
      id="architecture"
      className="relative py-32 px-6 overflow-hidden"
    >
      {/* Background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-orange-900/5 rounded-full blur-3xl" />
      </div>

      <div className="relative max-w-6xl mx-auto">
        {/* Section header */}
        <div
          className={`text-center mb-20 transition-all duration-1000 ${
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          }`}
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-border bg-card/50 text-xs text-muted-foreground mb-4">
            <GitBranch className="w-3 h-3" />
            System Architecture
          </div>
          <h2 className="text-4xl md:text-5xl font-bold tracking-tight">
            Decoupled{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-orange-400">
              Monorepo
            </span>
          </h2>
          <p className="mt-4 text-muted max-w-2xl mx-auto">
            A Turborepo-powered architecture designed for horizontal scaling and
            maintainability.
          </p>
        </div>

        {/* Architecture visualization */}
        <div
          className={`relative transition-all duration-1000 delay-200 ${
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          }`}
        >
          {/* Connection lines - SVG */}
          <svg
            className="absolute inset-0 w-full h-full pointer-events-none"
            style={{ zIndex: 0 }}
          >
            <defs>
              <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="rgba(255,95,0,0.5)" />
                <stop offset="50%" stopColor="rgba(255,95,0,0.8)" />
                <stop offset="100%" stopColor="rgba(255,95,0,0.5)" />
              </linearGradient>
            </defs>
            {/* Animated connection lines will be drawn based on layout */}
          </svg>

          {/* Nodes grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-6 md:gap-8">
            {architectureNodes.map((node, index) => (
              <div
                key={index}
                className={`group relative p-6 rounded-2xl border border-border bg-card/50 backdrop-blur-sm transition-all duration-500 hover:border-primary/50 hover:bg-card/70 ${
                  isVisible ? "opacity-100 scale-100" : "opacity-0 scale-95"
                }`}
                style={{ transitionDelay: `${300 + index * 100}ms` }}
              >
                {/* Animated corner accents */}
                <div className="absolute top-0 left-0 w-4 h-4 border-l-2 border-t-2 border-primary/30 rounded-tl-lg opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="absolute top-0 right-0 w-4 h-4 border-r-2 border-t-2 border-primary/30 rounded-tr-lg opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="absolute bottom-0 left-0 w-4 h-4 border-l-2 border-b-2 border-primary/30 rounded-bl-lg opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="absolute bottom-0 right-0 w-4 h-4 border-r-2 border-b-2 border-primary/30 rounded-br-lg opacity-0 group-hover:opacity-100 transition-opacity" />

                {/* Content */}
                <div className="relative z-10">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 rounded-lg bg-primary/10 text-primary group-hover:bg-primary/20 transition-colors">
                      {node.icon}
                    </div>
                    {/* Status indicator */}
                    <div className="ml-auto flex items-center gap-1.5">
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-500 opacity-75" />
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
                      </span>
                      <span className="text-[10px] text-muted-foreground font-mono">
                        ACTIVE
                      </span>
                    </div>
                  </div>
                  <h3 className="text-lg font-semibold mb-1">{node.title}</h3>
                  <p className="text-sm text-muted">{node.description}</p>
                </div>

                {/* Hover glow */}
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
              </div>
            ))}
          </div>

          {/* Central connection hub visualization */}
          <div className="mt-12 flex justify-center">
            <div className="relative">
              <div className="absolute inset-0 bg-primary/20 blur-2xl rounded-full" />
              <div className="relative px-6 py-3 rounded-full border border-primary/30 bg-card/70 backdrop-blur-sm">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className="w-3 h-3 rounded-full bg-primary animate-pulse" />
                    <div className="absolute inset-0 w-3 h-3 rounded-full bg-primary animate-ping opacity-50" />
                  </div>
                  <span className="font-mono text-sm text-muted-foreground">
                    Turborepo Orchestration Layer
                  </span>
                  <div className="flex gap-1">
                    {[...Array(3)].map((_, i) => (
                      <div
                        key={i}
                        className="w-1.5 h-1.5 rounded-full bg-primary/60"
                        style={{
                          animation: `pulse 1.5s ease-in-out ${i * 0.2}s infinite`,
                        }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
