"use client";

import { useEffect, useRef } from "react";
import { ArrowRight, Layers } from "lucide-react";
import Link from "next/link";

export function Hero() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationId: number;
    let nodes: Array<{
      x: number;
      y: number;
      vx: number;
      vy: number;
      radius: number;
      pulse: number;
      pulseSpeed: number;
    }> = [];
    let connections: Array<{
      from: number;
      to: number;
      progress: number;
      active: boolean;
    }> = [];

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.scale(dpr, dpr);
      initNodes();
    };

    const initNodes = () => {
      const rect = canvas.getBoundingClientRect();
      const nodeCount = 12;
      nodes = [];
      connections = [];

      for (let i = 0; i < nodeCount; i++) {
        nodes.push({
          x: Math.random() * rect.width,
          y: Math.random() * rect.height,
          vx: (Math.random() - 0.5) * 0.5,
          vy: (Math.random() - 0.5) * 0.5,
          radius: 3 + Math.random() * 3,
          pulse: Math.random() * Math.PI * 2,
          pulseSpeed: 0.02 + Math.random() * 0.02,
        });
      }

      // Create connections
      for (let i = 0; i < nodeCount; i++) {
        for (let j = i + 1; j < nodeCount; j++) {
          if (Math.random() > 0.7) {
            connections.push({
              from: i,
              to: j,
              progress: 0,
              active: Math.random() > 0.5,
            });
          }
        }
      }
    };

    const draw = () => {
      const rect = canvas.getBoundingClientRect();
      ctx.clearRect(0, 0, rect.width, rect.height);

      // Update and draw connections
      connections.forEach((conn) => {
        const from = nodes[conn.from];
        const to = nodes[conn.to];
        const dx = to.x - from.x;
        const dy = to.y - from.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < 250) {
          const opacity = (1 - dist / 250) * 0.5;

          // Draw base line
          ctx.beginPath();
          ctx.moveTo(from.x, from.y);
          ctx.lineTo(to.x, to.y);
          ctx.strokeStyle = `rgba(255, 95, 0, ${opacity * 0.3})`;
          ctx.lineWidth = 1;
          ctx.stroke();

          // Draw animated data flow
          if (conn.active) {
            conn.progress += 0.01;
            if (conn.progress > 1) conn.progress = 0;

            const flowX = from.x + dx * conn.progress;
            const flowY = from.y + dy * conn.progress;

            const gradient = ctx.createRadialGradient(
              flowX,
              flowY,
              0,
              flowX,
              flowY,
              8
            );
            gradient.addColorStop(0, `rgba(255, 95, 0, ${opacity})`);
            gradient.addColorStop(1, "rgba(255, 95, 0, 0)");

            ctx.beginPath();
            ctx.arc(flowX, flowY, 8, 0, Math.PI * 2);
            ctx.fillStyle = gradient;
            ctx.fill();
          }
        }
      });

      // Update and draw nodes
      nodes.forEach((node) => {
        // Update position
        node.x += node.vx;
        node.y += node.vy;

        // Bounce off edges
        if (node.x < 0 || node.x > rect.width) node.vx *= -1;
        if (node.y < 0 || node.y > rect.height) node.vy *= -1;

        // Update pulse
        node.pulse += node.pulseSpeed;
        const pulseScale = 1 + Math.sin(node.pulse) * 0.3;

        // Draw glow
        const gradient = ctx.createRadialGradient(
          node.x,
          node.y,
          0,
          node.x,
          node.y,
          node.radius * pulseScale * 4
        );
        gradient.addColorStop(0, "rgba(255, 95, 0, 0.6)");
        gradient.addColorStop(0.5, "rgba(255, 95, 0, 0.2)");
        gradient.addColorStop(1, "rgba(255, 95, 0, 0)");

        ctx.beginPath();
        ctx.arc(node.x, node.y, node.radius * pulseScale * 4, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();

        // Draw core
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.radius * pulseScale, 0, Math.PI * 2);
        ctx.fillStyle = "#FF5F00";
        ctx.fill();
      });

      animationId = requestAnimationFrame(draw);
    };

    resize();
    window.addEventListener("resize", resize);
    draw();

    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(animationId);
    };
  }, []);

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Ambient background gradients */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="ambient-bg absolute -top-1/2 -left-1/2 w-full h-full bg-gradient-radial from-primary/10 via-transparent to-transparent rounded-full blur-3xl" />
        <div className="ambient-bg-delayed absolute -bottom-1/2 -right-1/2 w-full h-full bg-gradient-radial from-orange-900/10 via-transparent to-transparent rounded-full blur-3xl" />
      </div>

      {/* Data flow canvas */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full opacity-60"
        style={{ pointerEvents: "none" }}
      />

      {/* Grid overlay */}
      <div
        className="absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
          backgroundSize: "60px 60px",
        }}
      />

      {/* Content */}
      <div className="relative z-10 max-w-5xl mx-auto px-6 text-center pt-24">
        {/* Badge */}
        <div className="animate-fade-up opacity-0 inline-flex items-center gap-2 px-4 py-2 rounded-full border border-border bg-card/50 backdrop-blur-sm mb-8">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
          </span>
          <span className="text-sm text-muted-foreground">
            Real-time synchronization active
          </span>
        </div>

        {/* Headline */}
        <h1 className="animate-fade-up opacity-0 animation-delay-100 text-5xl md:text-7xl lg:text-8xl font-bold tracking-tight leading-[1.1] text-balance">
          Mission-Critical
          <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-orange-400 to-primary">
            Collaboration.
          </span>
          <br />
          <span className="text-muted-foreground">Synchronized in Real-Time.</span>
        </h1>

        {/* Subheadline */}
        <p className="animate-fade-up opacity-0 animation-delay-200 mt-8 text-lg md:text-xl text-muted max-w-3xl mx-auto leading-relaxed text-pretty">
          <span className="text-foreground font-medium">crwsync</span> is a
          highly scalable, real-time workspace platform. Engineered with a
          decoupled monorepo, sub-millisecond Redis Pub/Sub, and an AI-powered
          agentic layer to streamline distributed project management.
        </p>

        {/* CTAs */}
        <div className="animate-fade-up opacity-0 animation-delay-300 mt-12 flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="#architecture"
            className="group flex items-center gap-2 px-6 py-3 text-sm font-medium border border-border rounded-lg hover:bg-secondary/50 transition-all"
          >
            <Layers className="w-4 h-4" />
            Explore the Architecture
          </Link>
          <Link
            href="#"
            className="group relative flex items-center gap-2 px-6 py-3 text-sm font-medium bg-primary text-primary-foreground rounded-lg animate-pulse-glow hover:scale-105 transition-transform"
          >
            Initialize Workspace
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>

        {/* Tech badges */}
        <div className="animate-fade-up opacity-0 animation-delay-400 mt-16 flex flex-wrap items-center justify-center gap-3">
          {["TypeScript", "NestJS", "Redis", "WebSocket", "PostgreSQL"].map(
            (tech) => (
              <span
                key={tech}
                className="px-3 py-1 text-xs font-mono text-muted-foreground border border-border rounded-md bg-card/30"
              >
                {tech}
              </span>
            )
          )}
        </div>
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
        <div className="w-6 h-10 rounded-full border-2 border-muted flex items-start justify-center p-2">
          <div className="w-1 h-2 bg-muted rounded-full" />
        </div>
      </div>
    </section>
  );
}
