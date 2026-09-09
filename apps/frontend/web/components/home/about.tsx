import Link from "next/link";

export default function About() {
  return (
    <section id="about" className="flex flex-col items-center gap-8 px-6 sm:px-12 pt-6 pb-12">
      <div className="flex items-center justify-center px-3 py-1.5 bg-background/15 dark:bg-linear-to-br from-foreground/20 via-foreground/12 to-foreground/10 border-[1.5px] border-foreground/20 backdrop-saturate-100 shadow-md shadow-black/5 rounded-full">
        <span className="text-balanced text-center text-sm text-muted-foreground tracking-wide leading-tighter">
          About the Builder
        </span>
      </div>

      <div className="flex flex-col items-center gap-4 max-w-2xl w-full p-8 bg-linear-to-br from-foreground/10 via-foreground/6 to-foreground/5 border-[1.5px] border-foreground/10 backdrop-saturate-100 shadow-md shadow-black/5 rounded-xl text-center">
        <h1 className="text-3xl lg:text-4xl font-bold">Tunya Lénárd-Sándor</h1>
        <p className="text-sm text-muted-foreground tracking-wide">
          Engineered crwsync end to end — public portal, authenticated dashboard, and a horizontally scalable real-time backend — solo.
        </p>
        <p className="text-sm lg:text-base text-muted-foreground text-balance leading-tight max-w-xl">
          I&apos;m always open to new opportunities and collaborations. Feel free to reach out if you have any questions or would like to discuss potential projects.
        </p>

        <div className="flex items-center gap-6 mt-2">
          <Link
            href="https://github.com/justtunya/crwsync"
            className="text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors underline underline-offset-2"
          >
            View Source
          </Link>
          <Link
            href="https://www.linkedin.com/in/lenard-tunya/"
            className="text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors underline underline-offset-2"
          >
            LinkedIn
          </Link>
        </div>
      </div>
    </section>
  );
}
