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

// Pentagon positions equally spaced around center (400, 340) with radius ~250
// Angles: -90°, -18°, 54°, 126°, 198° (pentagon, top-center start)
const desktopPositions = [
  { top: "2%",   left: "50%", translateX: "-50%", lineEnd: { x: 400, y: 90 } },   // top center
  { top: "18%",  right: "2%", lineEnd: { x: 660, y: 180 } },                       // top right
  { top: "55%",  right: "8%", lineEnd: { x: 620, y: 470 } },                       // bottom right
  { top: "55%",  left: "8%",  lineEnd: { x: 180, y: 470 } },                       // bottom left
  { top: "18%",  left: "2%",  lineEnd: { x: 140, y: 180 } },                       // top left
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

        {/* Desktop system map */}
        <div className="hidden lg:block relative w-full" style={{ height: 700 }}>
          {/* SVG connector lines */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 800 700" fill="none" preserveAspectRatio="xMidYMid meet">
            <defs>
              <radialGradient id="hubGlow" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="hsl(185, 75%, 45%)" stopOpacity="0.18" />
                <stop offset="60%" stopColor="hsl(260, 60%, 55%)" stopOpacity="0.06" />
                <stop offset="100%" stopColor="transparent" stopOpacity="0" />
              </radialGradient>
              <linearGradient id="lineGrad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="hsl(185, 75%, 55%)" />
                <stop offset="100%" stopColor="hsl(260, 60%, 55%)" />
              </linearGradient>
            </defs>

            {/* Radial glow behind hub */}
            <circle cx="400" cy="350" r="200" fill="url(#hubGlow)" />

            {/* Connector lines */}
            {desktopPositions.map((pos, i) => {
              const isHovered = hoveredTool === tools[i].id;
              return (
                <g key={tools[i].id}>
                  <line
                    x1={pos.lineEnd.x}
                    y1={pos.lineEnd.y}
                    x2="400"
                    y2="350"
                    stroke="url(#lineGrad)"
                    strokeWidth={isHovered ? 2 : 1}
                    opacity={isHovered ? 0.7 : 0.15}
                    className="transition-all duration-500"
                    strokeDasharray={isHovered ? "none" : "6 6"}
                  />
                  <circle
                    cx="400"
                    cy="350"
                    r={isHovered ? 6 : 3}
                    fill="hsl(185, 75%, 55%)"
                    opacity={isHovered ? 0.6 : 0.15}
                    className="transition-all duration-500"
                  />
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

          {/* Center Klyc hub — 3x bigger */}
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-20">
            <div className="w-56 h-56 rounded-full bg-card border border-border shadow-xl flex items-center justify-center relative">
              <div className="absolute inset-0 rounded-full animate-pulse-slow" style={{
                boxShadow: "0 0 50px 12px hsl(185 75% 55% / 0.14), 0 0 100px 30px hsl(260 60% 55% / 0.07)",
              }} />
              <img src={klycHub} alt="Klyc" className="w-44 h-44 object-contain rounded-full" />
            </div>
          </div>

          {/* Tool cards */}
          {tools.map((tool, i) => {
            const pos = desktopPositions[i];
            const isHovered = hoveredTool === tool.id;
            const posAny = pos as any;
            const style: React.CSSProperties = {
              position: "absolute",
              width: 210,
              ...(posAny.top !== undefined && { top: posAny.top }),
              ...(posAny.bottom !== undefined && { bottom: posAny.bottom }),
              ...(posAny.left !== undefined && { left: posAny.left }),
              ...(posAny.right !== undefined && { right: posAny.right }),
              ...(posAny.translateX && { transform: `translateX(${posAny.translateX})` }),
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
                  isHovered ? "scale-110" : ""
                }`} style={{ background: "linear-gradient(135deg, rgba(45,212,168,0.12), rgba(168,85,247,0.12))" }}>
                  <tool.icon className="w-5 h-5" style={{
                    stroke: "url(#iconGradient)",
                    color: "hsl(185, 75%, 45%)",
                  }} />
                </div>
                <h3 className="text-sm font-semibold mb-1.5 bg-clip-text text-transparent" style={{
                  backgroundImage: "linear-gradient(135deg, #2dd4a8, #6b8de3, #a855f7)",
                }}>
                  {tool.title}
                </h3>
                <p className={`text-xs leading-relaxed transition-all duration-400 ${
                  isHovered ? "text-foreground/80" : "text-muted-foreground"
                }`}>
                  {tool.description}
                </p>
              </div>
            );
          })}

          {/* SVG gradient def for icons */}
          <svg width="0" height="0" className="absolute">
            <defs>
              <linearGradient id="iconGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#2dd4a8" />
                <stop offset="50%" stopColor="#6b8de3" />
                <stop offset="100%" stopColor="#a855f7" />
              </linearGradient>
            </defs>
          </svg>
        </div>

        {/* Mobile layout */}
        <div className="lg:hidden flex flex-col items-center gap-6">
          <div className="w-36 h-36 rounded-full bg-card border border-border shadow-lg flex items-center justify-center relative mb-2">
            <div className="absolute inset-0 rounded-full" style={{
              boxShadow: "0 0 30px 6px hsl(185 75% 55% / 0.1), 0 0 60px 15px hsl(260 60% 55% / 0.05)",
            }} />
            <img src={klycHub} alt="Klyc" className="w-28 h-28 object-contain rounded-full" />
          </div>

          <div className="w-px h-6 bg-gradient-to-b from-primary/30 to-transparent" />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-lg">
            {tools.map((tool) => (
              <div
                key={tool.id}
                className="rounded-2xl border border-border bg-card/80 backdrop-blur-sm p-5 text-center flex flex-col items-center shadow-sm hover:shadow-md hover:border-primary/30 hover:-translate-y-0.5 transition-all duration-300"
              >
                <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3" style={{ background: "linear-gradient(135deg, rgba(45,212,168,0.12), rgba(168,85,247,0.12))" }}>
                  <tool.icon className="w-5 h-5 text-primary" />
                </div>
                <h3 className="text-sm font-semibold mb-1.5 bg-clip-text text-transparent" style={{
                  backgroundImage: "linear-gradient(135deg, #2dd4a8, #6b8de3, #a855f7)",
                }}>{tool.title}</h3>
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
