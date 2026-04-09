export default function Contact() {
  return (
    <section id="contact" className="flex flex-col items-center gap-8 px-6 sm:px-12 py-12 row-span-1">
      <div className="flex items-center justify-center px-3 py-1.5 bg-background/15 dark:bg-linear-to-br from-foreground/20 via-foreground/12 to-foreground/10 border-[1.5px] border-foreground/20 backdrop-saturate-100 shadow-md shadow-black/5 rounded-full">
        <span className="text-balanced text-center text-sm text-muted-foreground tracking-wide leading-tighter">
          Contact
        </span>
      </div>
    </section>
  );
}