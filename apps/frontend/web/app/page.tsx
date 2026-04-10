import dynamic from "next/dynamic";
import Header from "@/components/home/header";
import Hero from "@/components/home/hero";
import Features from "@/components/home/features";
import Architecture from "@/components/home/architecture";
import Contact from "@/components/home/contact";

const Footer = dynamic(() => import("@/components/home/footer"), {
  loading: () => <div className="h-32 bg-base-200/50 animate-pulse" />,
  ssr: true,
});

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-1">
        <Hero />
        <Features />
        <Architecture />
        <Contact />
      </main>
      <Footer />
    </div>
  );
}