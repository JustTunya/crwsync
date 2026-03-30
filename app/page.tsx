import { Navbar } from "./components/navbar";
import { Hero } from "./components/hero";
import { Features } from "./components/features";
import { Architecture } from "./components/architecture";
import { TechStack } from "./components/tech-stack";
import { Footer } from "./components/footer";

export default function Home() {
  return (
    <main className="relative min-h-screen bg-background overflow-hidden">
      {/* Global ambient background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="ambient-bg absolute top-0 -left-1/4 w-[800px] h-[800px] bg-gradient-radial from-primary/8 via-transparent to-transparent rounded-full blur-3xl" />
        <div className="ambient-bg-delayed absolute bottom-1/4 -right-1/4 w-[600px] h-[600px] bg-gradient-radial from-orange-900/8 via-transparent to-transparent rounded-full blur-3xl" />
      </div>

      {/* Noise texture overlay */}
      <div
        className="fixed inset-0 pointer-events-none opacity-[0.015]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
        }}
      />

      <Navbar />
      <Hero />
      <Features />
      <Architecture />
      <TechStack />
      <Footer />
    </main>
  );
}
