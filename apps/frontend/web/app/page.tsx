import dynamic from "next/dynamic";
import Header from "@/components/home/header";
import Hero from "@/components/home/hero";

const Footer = dynamic(() => import("@/components/home/footer"), {
  loading: () => <div className="h-32 bg-base-200/50 animate-pulse" />,
  ssr: true,
});

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <Hero />
      </main>
      <Footer />
    </div>
  );
}