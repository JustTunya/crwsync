import dynamic from "next/dynamic";
import Header from "@/components/home/header";
import Hero from "@/components/home/hero";
import { Topology } from "@/components/home/topology";
import { Section } from "@/components/home/section";
import { MotionRoot, Reveal } from "@/components/home/reveal";
import { WritePath } from "@/components/home/write-path";
import { Surfaces } from "@/components/home/surfaces";
import Architecture from "@/components/home/architecture";
import { Rigor } from "@/components/home/rigor";
import { FinalCta } from "@/components/home/final-cta";
import { Builder } from "@/components/home/builder";

const Footer = dynamic(() => import("@/components/home/footer"), {
  loading: () => <div className="h-40 border-t border-border" />,
  ssr: true,
});

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "crwsync",
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web",
  url: "https://crwsync.xyz",
  description:
    "A production-shaped team workspace: boards, chat, files, and schedules kept in sync over WebSockets, behind a NestJS API with Redis fan-out, BullMQ queues, and Postgres.",
  author: { "@type": "Person", name: "Tunya Lénárd-Sándor", url: "https://www.linkedin.com/in/lenard-tunya/" },
  codeRepository: "https://github.com/justtunya/crwsync",
  license: "https://polyformproject.org/licenses/noncommercial/1.0.0/",
};

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <Header />
      <main id="main-content" className="flex-1">
        <MotionRoot>
          <Hero />
          <Topology />

          <Section
            id="sync"
            title="One write. Every tab, every instance."
            lead="Every change takes the same path: the dashboard updates at once, the API validates and persists, and the gateway fans the confirmed state out to everyone else. Pick a flow and step through what actually runs."
          >
            <Reveal>
              <WritePath />
            </Reveal>
          </Section>

          <Section
            id="product"
            title="What the crew works in"
            lead="Boards are the front door. Behind them are rooms, file storage, a week view, and search, all sharing the same workspace, roles, and socket connection."
          >
            <Reveal>
              <Surfaces />
            </Reveal>
          </Section>

          <Architecture />

          <Section
            id="reliability"
            title="Built to survive real traffic"
            lead="The parts a screenshot cannot show: how sessions expire, who may call what, how hard a client can hit an endpoint, and what happens when a dependency is slow. Each cell names the code that enforces it."
          >
            <Reveal>
              <Rigor />
            </Reveal>
          </Section>

          <FinalCta />
          <Builder />
        </MotionRoot>
      </main>
      <Footer />
    </div>
  );
}
