import Header from "@/components/home/header";
import Hero from "@/components/home/hero";
import Templates from "@/components/home/templates";
import Footer from "@/components/home/footer";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <Hero />
        <Templates />
      </main>
      <Footer />
    </div>
  );
}