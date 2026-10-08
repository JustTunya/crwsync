const scenarios = [
  {
    title: "A renovation crew",
    body: "A site lead keeps jobs on a board, one column per stage. Photos and permits go into the job's file room, and the crew asks questions in a room next to the board instead of a group text that scrolls away.",
  },
  {
    title: "A small design studio",
    body: "Five people share client work. Briefs become cards with checklists and due dates, the week view shows what lands when, and a client change gets one message that everyone sees at the same moment.",
  },
  {
    title: "A volunteer organisation",
    body: "Organisers split an event into tasks, assign owners, and watch the board fill in during the day. Roles keep sign-offs with the people who should give them.",
  },
];

export function WhoFor() {
  return (
    <ul className="grid gap-px overflow-hidden rounded-xl border border-border bg-border md:grid-cols-3">
      {scenarios.map((s) => (
        <li key={s.title} className="bg-card p-5 sm:p-6">
          <h3 className="text-lg font-semibold">{s.title}</h3>
          <p className="mt-2 text-sm text-muted-foreground leading-normal text-pretty">{s.body}</p>
        </li>
      ))}
    </ul>
  );
}
