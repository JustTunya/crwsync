import Image from "next/image";
import { BentoCard } from "@/components/ui/bento-grid"
import { cn } from "@/lib/utils";

const cards = {
  chat: {
    name: "Real-Time Chat & Messaging",
    description: "Team members can communicate instantly in dedicated chat rooms",
    icon: "/Paperplane.svg",
  },
  kanban: {
    name: "Kanban Task Boards",
    description: "Visualize workflows, track progress, and manage tasks with drag-and-drop ease.",
    icon: "/PieChart.svg",
  },
  workspaces: {
    name: "Collaborative Workspaces",
    description: "Users can manage projects and role-based access within isolated workspaces.",
    icon: "/Link.svg",
  },
  scheduling: {
    name: "Project Scheduling",
    description: "Track timelines and deadlines with built-in calendars and schedules.",
    icon: "/Calendar.svg",
  },
  notifications: {
    name: "Notifications",
    description: "An integrated notification system keeps users updated on activities and mentions.",
    icon: "/Bell.svg",
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
            background={
              <div className={cn(
                "absolute inset-0 flex items-center justify-center w-full transition-all duration-500",
                "max-lg:opacity-15 max-lg:h-full",
                "lg:opacity-100 lg:h-[calc(100%-5rem)]",
                "lg:group-hover/col:opacity-15 lg:group-hover/col:h-full",
                "lg:group-hover/card:opacity-100! lg:group-hover/card:h-[calc(100%-5rem)]!"
              )}>
                <Image src={cards.kanban.icon} alt="Kanban" width={500} height={500} className="size-64" />
              </div>
            }
          />
          <BentoCard 
            name={cards.workspaces.name}
            description={cards.workspaces.description}
            className="h-56 sm:h-64 lg:h-auto lg:flex-1 lg:hover:flex-2! transition-all duration-500 group/card"
            background={
              <div className={cn(
                "absolute inset-0 flex items-center justify-center w-full transition-all duration-500",
                "max-lg:opacity-15 max-lg:h-full",
                "lg:opacity-15 lg:h-full",
                "lg:group-hover/card:opacity-100! lg:group-hover/card:h-[calc(100%-5rem)]!"
              )}>
                <Image src={cards.workspaces.icon} alt="Workspaces" width={500} height={500} className="size-64" />
              </div>
            }
          />
        </div>

        {/* Column 2 */}
        <div className="group/col flex flex-col gap-4 flex-1 h-full">
          <BentoCard 
            name={cards.chat.name}
            description={cards.chat.description}
            className="h-56 sm:h-64 lg:h-auto lg:flex-3 transition-all duration-500 group/card"
            background={
              <div className={cn(
                "absolute inset-0 flex items-center justify-center w-full transition-all duration-500",
                "max-lg:opacity-15 max-lg:h-full",
                "lg:opacity-100 lg:h-[calc(100%-5rem)]"
              )}>
                <Image src={cards.chat.icon} alt="Chat" width={500} height={500} className="size-64" />
              </div>
            }
          />
        </div>

        {/* Column 3 */}
        <div className="group/col flex flex-col gap-4 flex-1 h-full">
          <BentoCard 
            name={cards.scheduling.name}
            description={cards.scheduling.description}
            className="h-56 sm:h-64 lg:h-auto lg:flex-1 lg:hover:flex-2! transition-all duration-500 group/card"
            background={
              <div className={cn(
                "absolute inset-0 flex items-center justify-center w-full transition-all duration-500",
                "max-lg:opacity-15 max-lg:h-full",
                "lg:opacity-15 lg:h-full",
                "lg:group-hover/card:opacity-100! lg:group-hover/card:h-[calc(100%-5rem)]!"
              )}>
                <Image src={cards.scheduling.icon} alt="Scheduling" width={500} height={500} className="size-64" />
              </div>
            }
          />
          <BentoCard 
            name={cards.notifications.name}
            description={cards.notifications.description}
            className="h-56 sm:h-64 lg:h-auto lg:flex-2 lg:group-hover/col:flex-1 lg:hover:flex-2! transition-all duration-500 group/card"
            background={
              <div className={cn(
                "absolute inset-0 flex items-center justify-center w-full transition-all duration-500",
                "max-lg:opacity-15 max-lg:h-full",
                "lg:opacity-100 lg:h-[calc(100%-5rem)]",
                "lg:group-hover/col:opacity-15 lg:group-hover/col:h-full",
                "lg:group-hover/card:opacity-100! lg:group-hover/card:h-[calc(100%-5rem)]!"
              )}>
                <Image src={cards.notifications.icon} alt="Notifications" width={500} height={500} className="size-64" />
              </div>
            }
          />
        </div>
      </div>
    </section>
  );
}