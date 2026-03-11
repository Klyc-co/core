import { Search, Palette, Target, LayoutGrid, TrendingUp } from "lucide-react";

const tools = [
  {
    title: "Research & Insights Tool",
    description: "Finds trends, audience insights, and competitor intelligence.",
    icon: Search,
  },
  {
    title: "Creative Media Tool",
    description: "Leads visual concepts, creative direction, and repurposing.",
    icon: Palette,
  },
  {
    title: "Strategy & Messaging Tool",
    description: "Shapes positioning, hooks, CTAs, and campaign direction.",
    icon: Target,
  },
  {
    title: "Platform Content Tool",
    description: "Creates platform-native content for every channel.",
    icon: LayoutGrid,
  },
  {
    title: "Social Performance Tool",
    description: "Tracks momentum, engagement signals, and optimization opportunities.",
    icon: TrendingUp,
  },
];

const LandingTeam = () => {
  return (
    <section
      className="py-24 sm:py-32 px-4 sm:px-6"
      style={{
        background: "linear-gradient(135deg, #2dd4a8, #6b8de3, #a855f7)",
      }}
    >
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-white mb-4">
            Tools Behind Klyc
          </h2>
          <p className="text-lg text-white/80 max-w-2xl mx-auto">
            Meet the specialist tools that power Klyc behind the scenes.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
          {tools.map((tool) => (
            <div
              key={tool.title}
              className="group rounded-2xl border border-border bg-card p-6 shadow-sm hover:shadow-lg transition-all duration-300 text-center flex flex-col items-center"
            >
              <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4"
                style={{
                  background: "linear-gradient(135deg, rgba(45,212,168,0.12), rgba(168,85,247,0.12))",
                }}
              >
                <tool.icon className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-3">
                {tool.title}
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {tool.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default LandingTeam;
