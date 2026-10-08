import type { Metadata } from "next";
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
import { WhoFor } from "@/components/home/who-for";
import { EarlyAccess } from "@/components/home/early-access";
import { siteUrl } from "@/lib/site";

export const metadata: Metadata = { alternates: { canonical: "/" } };

const Footer = dynamic(() => import("@/components/home/footer"), {
  loading: () => <div className="h-40 border-t border-border" />,
  ssr: true,
});

const author = { "@type": "Person", name: "Tunya Lénárd-Sándor", url: "https://www.linkedin.com/in/lenard-tunya/" };

const softwareApplication = {
  "@type": "SoftwareApplication",
  "@id": `${siteUrl}/#app`,
  name: "crwsync",
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web",
  url: siteUrl,
  image: `${siteUrl}/demo/poster.png`,
  description:
    "A shared workspace for small teams: task boards, chat rooms, files, and schedules in one place, updated live in every open tab.",
  author,
  codeRepository: "https://github.com/justtunya/crwsync",
  license: "https://polyformproject.org/licenses/noncommercial/1.0.0/",
};

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    softwareApplication,
    { "@type": "WebSite", "@id": `${siteUrl}/#website`, url: siteUrl, name: "crwsync", inLanguage: "en", publisher: author },
  ],
};

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <Header />
      <main id="main-content" className="flex-1">
        <MotionRoot>
          <Hero />

          <Section
            id="who"
            title="Who it's for"
            lead="Small teams and crews that run their work from boards, chat, and files, and want it in one place. These are example scenarios, not customer accounts."
          >
            <Reveal>
              <WhoFor />
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

          <EarlyAccess />

          <Section
            id="built"
            title="How it's built"
            lead="For technical evaluators: the services, the write path, and the safeguards behind the product. Each section names the code that does the work."
            className="pb-0 sm:pb-0 flow-root"
          />
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
