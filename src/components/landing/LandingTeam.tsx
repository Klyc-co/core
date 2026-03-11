const tools = [
  {
    title: "Research & Insights Tool",
    description: "Finds trends, audience insights, and competitor intelligence.",
  },
  {
    title: "Creative Media Tool",
    description: "Leads visual concepts, creative direction, and repurposing.",
  },
  {
    title: "Strategy & Messaging Tool",
    description: "Shapes positioning, hooks, CTAs, and campaign direction.",
  },
  {
    title: "Platform Content Tool",
    description: "Creates platform-native content for every channel.",
  },
  {
    title: "Social Performance Tool",
    description: "Tracks momentum, engagement signals, and optimization opportunities.",
  },
];

const LandingTeam = () => {
  return (
    <section className="py-24 sm:py-32 px-4 sm:px-6 bg-background">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-foreground mb-4">
            Tools Behind Klyc
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Meet the specialist tools that power Klyc behind the scenes.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
          {tools.map((tool) => (
            <div
              key={tool.title}
              className="group rounded-2xl border border-border bg-card p-6 shadow-sm hover:shadow-lg hover:border-primary/30 transition-all duration-300"
            >
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
