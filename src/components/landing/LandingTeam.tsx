import { useState } from "react";
import { Search, Palette, Target, LayoutGrid, TrendingUp } from "lucide-react";
import klycHub from "@/assets/klyc-hub.png";

const tools = [
  {
    id: "research",
    title: "Research & Insights",
    description: "Finds trends, audience shifts, and competitor signals.",
    icon: Search,
  },
  {
    id: "strategy",
    title: "Strategy & Messaging",
    description: "Builds positioning, hooks, CTAs, and campaign direction.",
    icon: Target,
  },
  {
    id: "platform",
    title: "Platform Content",
    description: "Turns strategy into platform-native content for every channel.",
    icon: LayoutGrid,
  },
  {
    id: "creative",
    title: "Creative Media",
    description: "Shapes visual concepts, repurposing, and creative direction.",
    icon: Palette,
  },
  {
    id: "performance",
    title: "Social Performance",
    description: "Tracks momentum and spots optimization opportunities early.",
    icon: TrendingUp,
  },
];

// Desktop positions for 5 tools around center hub (percentage-based)
const desktopPositions = [
  { top: "4%", left: "50%", translate: "-50%", lineEnd: { x: 400, y: 90 } },    // top center
  { top: "35%", left: "4%", translate: "0", lineEnd: { x: 155, y: 220 } },       // left
  { top: "35%", right: "4%", translate: "0", lineEnd: { x: 645, y: 220 } },      // right
  { bottom: "4%", left: "18%", translate: "0", lineEnd: { x: 230, y: 400 } },    // bottom left
  { bottom: "4%", right: "18%", translate: "0", lineEnd: { x: 570, y: 400 } },   // bottom right
];

const LandingTeam = () => {
  const [hoveredTool, setHoveredTool] = useState<string | null>(null);

  return (
    <section className="py-24 sm:py-32 px-4 sm:px-6 bg-background relative overflow-hidden">
      {/* Subtle grid background */}
      <div className="absolute inset-0 opacity-[0.03]" style={{
        backgroundImage: `radial-gradient(circle, hsl(var(--foreground)) 1px, transparent 1px)`,
        backgroundSize: "32px 32px",
      }} />

      <div className="max-w-6xl mx-auto relative z-10">
        {/* Section header */}
        <div className="text-center mb-16 sm:mb-20">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-foreground mb-4">
            Tools Behind Klyc
          </h2>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto">
            Five specialist systems. One marketing engine.
          </p>
        </div>

        {/* Desktop system map */}
        <div className="hidden lg:block relative w-full" style={{ height: 560 }}>
          {/* SVG connector lines */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 800 560" fill="none" preserveAspectRatio="xMidYMid meet">
            <defs>
              <radialGradient id="hubGlow" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="hsl(185, 75%, 45%)" stopOpacity="0.18" />
                <stop offset="60%" stopColor="hsl(260, 60%, 55%)" stopOpacity="0.06" />
                <stop offset="100%" stopColor="transparent" stopOpacity="0" />
              </radialGradient>
              <linearGradient id="lineGrad0" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="hsl(185, 75%, 55%)" />
                <stop offset="100%" stopColor="hsl(260, 60%, 55%)" />
              </linearGradient>
            </defs>

            {/* Radial glow behind hub */}
            <circle cx="400" cy="280" r="140" fill="url(#hubGlow)" />

            {/* Connector lines */}
            {desktopPositions.map((pos, i) => {
              const isHovered = hoveredTool === tools[i].id;
              return (
                <g key={tools[i].id}>
                  <line
                    x1={pos.lineEnd.x}
                    y1={pos.lineEnd.y}
                    x2="400"
                    y2="280"
                    stroke="url(#lineGrad0)"
                    strokeWidth={isHovered ? 2 : 1}
                    opacity={isHovered ? 0.7 : 0.15}
                    className="transition-all duration-500"
                    strokeDasharray={isHovered ? "none" : "6 6"}
                  />
                  {/* Glow dot at hub connection point */}
                  <circle
                    cx="400"
                    cy="280"
                    r={isHovered ? 6 : 3}
                    fill="hsl(185, 75%, 55%)"
                    opacity={isHovered ? 0.6 : 0.15}
                    className="transition-all duration-500"
                  />
                  {/* Glow dot at tool end */}
                  <circle
                    cx={pos.lineEnd.x}
                    cy={pos.lineEnd.y}
                    r={isHovered ? 5 : 2.5}
                    fill="hsl(260, 60%, 55%)"
                    opacity={isHovered ? 0.5 : 0.12}
                    className="transition-all duration-500"
                  />
                </g>
              );
            })}
          </svg>

          {/* Center Klyc hub */}
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-20">
            <div className="w-32 h-32 rounded-full bg-card border border-border shadow-xl flex items-center justify-center relative">
              <div className="absolute inset-0 rounded-full animate-pulse-slow" style={{
                boxShadow: "0 0 40px 8px hsl(185 75% 55% / 0.12), 0 0 80px 20px hsl(260 60% 55% / 0.06)",
              }} />
              <img src={klycHub} alt="Klyc" className="w-24 h-24 object-contain rounded-full" />
            </div>
          </div>

          {/* Tool cards at desktop positions */}
          {tools.map((tool, i) => {
            const pos = desktopPositions[i];
            const isHovered = hoveredTool === tool.id;
            const style: React.CSSProperties = {
              position: "absolute",
              ...(pos.top !== undefined && { top: pos.top }),
              ...(pos.bottom !== undefined && { bottom: pos.bottom }),
              ...(pos.left !== undefined && { left: pos.left }),
              ...(pos.right !== undefined && { right: pos.right }),
              ...(pos.translate && i === 0 && { transform: `translateX(${pos.translate})` }),
              width: 220,
            };

            return (
              <div
                key={tool.id}
                style={style}
                className={`z-10 rounded-2xl border bg-card/80 backdrop-blur-sm p-5 text-center flex flex-col items-center cursor-default transition-all duration-400 ${
                  isHovered
                    ? "border-primary/40 shadow-lg -translate-y-1"
                    : "border-border shadow-sm"
                }`}
                onMouseEnter={() => setHoveredTool(tool.id)}
                onMouseLeave={() => setHoveredTool(null)}
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 transition-all duration-400 ${
                  isHovered ? "bg-primary/15 scale-110" : "bg-secondary"
                }`}>
                  <tool.icon className={`w-5 h-5 transition-colors duration-400 ${
                    isHovered ? "text-primary" : "text-muted-foreground"
                  }`} />
                </div>
                <h3 className="text-sm font-semibold text-foreground mb-1.5">{tool.title}</h3>
                <p className={`text-xs leading-relaxed transition-all duration-400 ${
                  isHovered ? "text-foreground/80" : "text-muted-foreground"
                }`}>
                  {tool.description}
                </p>
              </div>
            );
          })}
        </div>

        {/* Tablet / Mobile layout */}
        <div className="lg:hidden flex flex-col items-center gap-6">
          {/* Klyc hub */}
          <div className="w-24 h-24 rounded-full bg-card border border-border shadow-lg flex items-center justify-center relative mb-2">
            <div className="absolute inset-0 rounded-full" style={{
              boxShadow: "0 0 30px 6px hsl(185 75% 55% / 0.1), 0 0 60px 15px hsl(260 60% 55% / 0.05)",
            }} />
            <img src={klycHub} alt="Klyc" className="w-18 h-18 object-contain rounded-full" />
          </div>

          {/* Vertical connector */}
          <div className="w-px h-6 bg-gradient-to-b from-primary/30 to-transparent" />

          {/* Tool cards stacked */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-lg">
            {tools.map((tool) => (
              <div
                key={tool.id}
                className="rounded-2xl border border-border bg-card/80 backdrop-blur-sm p-5 text-center flex flex-col items-center shadow-sm hover:shadow-md hover:border-primary/30 hover:-translate-y-0.5 transition-all duration-300"
              >
                <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center mb-3">
                  <tool.icon className="w-5 h-5 text-muted-foreground" />
                </div>
                <h3 className="text-sm font-semibold text-foreground mb-1.5">{tool.title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{tool.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default LandingTeam;
