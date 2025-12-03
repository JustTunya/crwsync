import Header from "@/components/home/header";
import Hero from "@/components/home/hero";
import Footer from "@/components/home/footer";

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