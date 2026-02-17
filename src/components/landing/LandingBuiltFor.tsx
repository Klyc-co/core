import AnimateOnScroll from "./AnimateOnScroll";
import { Lightbulb, Building2, Rocket, Target, Video } from "lucide-react";

const audiences = [
  { icon: Lightbulb, title: "FOUNDERS & GROWTH TEAMS", line: "Replace your entire marketing stack with one execution engine." },
  { icon: Building2, title: "ENTERPRISE MARKETING", line: "Distribute at scale without adding headcount." },
  { icon: Rocket, title: "AGENCIES", line: "Multiply client output without multiplying cost." },
  { icon: Target, title: "DISTRIBUTED SALES TEAMS", line: "Turn every rep into a measurable content channel." },
  { icon: Video, title: "CREATOR BRANDS", line: "Systematize what made you grow — and scale it." },
];

const LandingBuiltFor = () => {
  return (
    <section className="py-24 sm:py-32 lg:py-40 px-4 sm:px-6 bg-[#f5f7fa]">
      <div className="max-w-5xl mx-auto">
        <AnimateOnScroll>
          <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-[#191a1f] tracking-tight leading-tight mb-6">
            Built for Teams That Want Scale.
          </h2>
          <p className="text-lg sm:text-xl md:text-2xl font-light mb-16 max-w-3xl">
            <span className="text-[#191a1f]/80">KLYC isn't for posting more.</span>
            <br />
            <span
              className="font-medium bg-clip-text text-transparent"
              style={{ backgroundImage: "linear-gradient(135deg, #2dd4a8, #6b8de3, #a855f7)" }}
            >
              It's for building visibility infrastructure.
            </span>
          </p>
        </AnimateOnScroll>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {audiences.map((a, i) => (
            <AnimateOnScroll key={i} delay={80 + i * 70}>
              <div
                className="group relative rounded-xl p-px transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
                style={{
                  background: "linear-gradient(135deg, rgba(45,212,168,0.4), rgba(107,141,227,0.4), rgba(168,85,247,0.4))",
                }}
              >
                <div className="relative rounded-xl p-6 sm:p-7 h-full overflow-hidden bg-white">
                  {/* Subtle glow on hover */}
                  <div
                    className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                    style={{
                      background: "radial-gradient(ellipse at 50% 0%, rgba(45,212,168,0.06) 0%, transparent 70%)",
                    }}
                  />

                  <div className="relative z-10">
                    <a.icon
                      className="w-7 h-7 mb-4 transition-transform duration-300 group-hover:scale-110"
                      style={{ stroke: "url(#brandGrad)" }}
                      strokeWidth={1.5}
                    />
                    <h3
                      className="text-xs sm:text-sm font-bold tracking-widest mb-3 bg-clip-text text-transparent"
                      style={{ backgroundImage: "linear-gradient(135deg, #2dd4a8, #6b8de3)" }}
                    >
                      {a.title}
                    </h3>
                    <p className="text-sm sm:text-base text-[#6b7280] font-light leading-relaxed">
                      {a.line}
                    </p>
                  </div>
                </div>
              </div>
            </AnimateOnScroll>
          ))}
        </div>

        {/* SVG gradient definition for icons */}
        <svg width="0" height="0" className="absolute">
          <defs>
            <linearGradient id="brandGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#2dd4a8" />
              <stop offset="50%" stopColor="#6b8de3" />
              <stop offset="100%" stopColor="#a855f7" />
            </linearGradient>
          </defs>
        </svg>
      </div>
    </section>
  );
};

export default LandingBuiltFor;
