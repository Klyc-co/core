import { useState } from "react";
import { Search, Palette, Target, LayoutGrid, TrendingUp } from "lucide-react";
import klycHub from "@/assets/klyc-hub.png";

const tools = [
  { id: "research", title: "Research & Insights", description: "Finds trends, audience shifts, and competitor signals.", icon: Search },
  { id: "strategy", title: "Strategy & Messaging", description: "Builds positioning, hooks, CTAs, and campaign direction.", icon: Target },
  { id: "platform", title: "Platform Content", description: "Turns strategy into platform-native content for every channel.", icon: LayoutGrid },
  { id: "creative", title: "Creative Media", description: "Shapes visual concepts, repurposing, and creative direction.", icon: Palette },
  { id: "performance", title: "Social Performance", description: "Tracks momentum and spots optimization opportunities early.", icon: TrendingUp },
];

const LandingTeam = () => {
  const [hoveredTool, setHoveredTool] = useState<string | null>(null);

  return (
    <section className="py-24 sm:py-32 px-4 sm:px-6 bg-background relative overflow-hidden">
      <div className="absolute inset-0 opacity-[0.03]" style={{
        backgroundImage: `radial-gradient(circle, hsl(var(--foreground)) 1px, transparent 1px)`,
        backgroundSize: "32px 32px",
      }} />

      <div className="max-w-5xl mx-auto relative z-10">
        <div className="text-center mb-16 sm:mb-20">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight mb-4 bg-clip-text text-transparent" style={{
            backgroundImage: "linear-gradient(135deg, #2dd4a8, #6b8de3, #a855f7)",
          }}>
            Tools Behind Klyc
          </h2>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto">
            Five specialist systems. One marketing engine.
          </p>
        </div>

        {/* Klyc Hub — 3x size */}
        <div className="flex justify-center mb-10">
          <div className="w-64 h-64 sm:w-80 sm:h-80 rounded-full bg-card border border-border shadow-xl flex items-center justify-center relative">
            <div className="absolute inset-0 rounded-full animate-pulse-slow" style={{
              boxShadow: "0 0 60px 16px hsl(185 75% 55% / 0.14), 0 0 120px 40px hsl(260 60% 55% / 0.07)",
            }} />
            <img src={klycHub} alt="Klyc" className="w-52 h-52 sm:w-64 sm:h-64 object-contain rounded-full" />
          </div>
        </div>

        {/* Connector line */}
        <div className="flex justify-center mb-8">
          <div className="w-px h-10 bg-gradient-to-b from-primary/40 to-transparent" />
        </div>

        {/* Tool cards grid below */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mx-auto">
          {tools.map((tool) => {
            const isHovered = hoveredTool === tool.id;
            return (
              <div
                key={tool.id}
                className={`rounded-2xl border bg-card/80 backdrop-blur-sm p-5 text-center flex flex-col items-center cursor-default transition-all duration-300 ${
                  isHovered ? "border-primary/40 shadow-lg -translate-y-1" : "border-border shadow-sm"
                }`}
                onMouseEnter={() => setHoveredTool(tool.id)}
                onMouseLeave={() => setHoveredTool(null)}
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 transition-all duration-300 ${
                  isHovered ? "scale-110" : ""
                }`} style={{ background: "linear-gradient(135deg, rgba(45,212,168,0.12), rgba(168,85,247,0.12))" }}>
                  <tool.icon className="w-5 h-5" style={{ color: "hsl(185, 75%, 45%)" }} />
                </div>
                <h3 className="text-sm font-semibold mb-1.5 bg-clip-text text-transparent" style={{
                  backgroundImage: "linear-gradient(135deg, #2dd4a8, #6b8de3, #a855f7)",
                }}>{tool.title}</h3>
                <p className={`text-xs leading-relaxed transition-all duration-300 ${
                  isHovered ? "text-foreground/80" : "text-muted-foreground"
                }`}>{tool.description}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default LandingTeam;
