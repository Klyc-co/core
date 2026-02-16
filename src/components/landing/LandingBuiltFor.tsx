import AnimateOnScroll from "./AnimateOnScroll";

const audiences = [
  { emoji: "🧠", title: "FOUNDERS & GROWTH TEAMS", line: "Replace your entire marketing stack with one execution engine." },
  { emoji: "🏢", title: "ENTERPRISE MARKETING", line: "Distribute at scale without adding headcount." },
  { emoji: "🚀", title: "AGENCIES", line: "Multiply client output without multiplying cost." },
  { emoji: "🎯", title: "DISTRIBUTED SALES TEAMS", line: "Turn every rep into a measurable content channel." },
  { emoji: "🎥", title: "CREATOR BRANDS", line: "Systematize what made you grow — and scale it." },
];

const LandingBuiltFor = () => {
  return (
    <section className="py-24 sm:py-32 lg:py-40 px-4 sm:px-6" style={{ background: "#08080c" }}>
      <div className="max-w-5xl mx-auto">
        <AnimateOnScroll>
          <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-white tracking-tight leading-tight mb-6">
            Built for Teams That Want Scale.
          </h2>
          <p className="text-lg sm:text-xl md:text-2xl font-light mb-16 max-w-3xl">
            <span className="text-white/80">KLYC isn't for posting more.</span>
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
                className="group relative rounded-xl p-px transition-all duration-300 hover:-translate-y-1"
                style={{
                  background: "linear-gradient(135deg, rgba(45,212,168,0.35), rgba(107,141,227,0.35), rgba(168,85,247,0.35))",
                }}
              >
                <div
                  className="relative rounded-xl p-6 sm:p-7 h-full overflow-hidden"
                  style={{ background: "#0e0e14" }}
                >
                  {/* Subtle glow on hover */}
                  <div
                    className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                    style={{
                      background: "radial-gradient(ellipse at 50% 0%, rgba(45,212,168,0.08) 0%, transparent 70%)",
                    }}
                  />

                  <div className="relative z-10">
                    <span className="text-2xl sm:text-3xl block mb-4 transition-transform duration-300 group-hover:scale-110 inline-block">
                      {a.emoji}
                    </span>
                    <h3
                      className="text-xs sm:text-sm font-bold tracking-widest mb-3 bg-clip-text text-transparent"
                      style={{ backgroundImage: "linear-gradient(135deg, #2dd4a8, #6b8de3)" }}
                    >
                      {a.title}
                    </h3>
                    <p className="text-sm sm:text-base text-white/60 font-light leading-relaxed">
                      {a.line}
                    </p>
                  </div>
                </div>
              </div>
            </AnimateOnScroll>
          ))}
        </div>
      </div>
    </section>
  );
};

export default LandingBuiltFor;
