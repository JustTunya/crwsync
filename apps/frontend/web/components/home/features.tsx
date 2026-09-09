import { BentoCard } from "@/components/ui/bento-grid"

const cards = {
  chat: {
    name: "Real-Time Chat & Messaging",
    description: "Teammates communicate instantly in dedicated chat rooms, live over WebSockets.",
  },
  kanban: {
    name: "Kanban Task Boards",
    description: "Visualize workflows, track progress, and manage tasks with drag-and-drop ease.",
  },
  workspaces: {
    name: "Collaborative Workspaces",
    description: "Manage projects and role-based access within isolated workspaces.",
  },
  scheduling: {
    name: "Project Scheduling",
    description: "Track timelines and deadlines with built-in calendars and schedules.",
  },
  notifications: {
    name: "Notifications",
    description: "Keeps everyone updated on activity and mentions, in real time.",
  },
};

export default function Features() {
  return (
    <section id="features" className="flex flex-col justify-center items-center gap-8 px-6 sm:px-12 py-12">
      <div className="flex items-center justify-center px-3 py-1.5 bg-background/15 dark:bg-linear-to-br from-foreground/20 via-foreground/12 to-foreground/10 border-[1.5px] border-foreground/20 backdrop-saturate-100 shadow-md shadow-black/5 rounded-full">
        <span className="text-balanced text-center text-sm text-muted-foreground tracking-wide leading-tighter">
          Features
        </span>
      </div>

      <div className="flex flex-col lg:flex-row w-full lg:h-128 max-w-6xl gap-4 mx-auto">
        {/* Column 1 */}
        <div className="group/col flex flex-col gap-4 flex-1 h-full">
          <BentoCard
            name={cards.kanban.name}
            description={cards.kanban.description}
            className="h-56 sm:h-64 lg:h-auto lg:flex-2 lg:group-hover/col:flex-1 lg:hover:flex-2! transition-all duration-500 group/card"
          />
          <BentoCard
            name={cards.workspaces.name}
            description={cards.workspaces.description}
            className="h-56 sm:h-64 lg:h-auto lg:flex-1 lg:hover:flex-2! transition-all duration-500 group/card"
          />
        </div>

        {/* Column 2 */}
        <div className="group/col flex flex-col gap-4 flex-1 h-full">
          <BentoCard
            name={cards.chat.name}
            description={cards.chat.description}
            className="h-56 sm:h-64 lg:h-auto lg:flex-3 transition-all duration-500 group/card"
          />
        </div>

        {/* Column 3 */}
        <div className="group/col flex flex-col gap-4 flex-1 h-full">
          <BentoCard
            name={cards.scheduling.name}
            description={cards.scheduling.description}
            className="h-56 sm:h-64 lg:h-auto lg:flex-1 lg:hover:flex-2! transition-all duration-500 group/card"
          />
          <BentoCard
            name={cards.notifications.name}
            description={cards.notifications.description}
            className="h-56 sm:h-64 lg:h-auto lg:flex-2 lg:group-hover/col:flex-1 lg:hover:flex-2! transition-all duration-500 group/card"
          />
        </div>
      </div>
    </section>
  );
}
