import AnimateOnScroll from "./AnimateOnScroll";

const traditionalTimeline = [
  { time: "Week 1", label: "Strategy alignment" },
  { time: "Week 2", label: "Content planning" },
  { time: "Week 3", label: "Asset production" },
  { time: "Week 4", label: "Scheduling + review" },
  { time: "Week 5", label: "Performance analysis begins" },
];

const klycTimeline = [
  { time: "Minute 0", label: "Campaign defined" },
  { time: "Minute 5", label: "AI generates platform-native content" },
  { time: "Minute 15", label: "Distribution queued across channels" },
  { time: "Minute 30", label: "Performance tracking live" },
];

const LandingSpeed = () => {
  return (
    <section id="execution-speed" className="relative py-16 sm:py-20 lg:py-24 px-4 sm:px-6 bg-white overflow-hidden">
      <div className="max-w-5xl mx-auto">
        <AnimateOnScroll>
          <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight leading-tight mb-4">
            <span className="text-foreground">4 Weeks of Marketing</span>
            <br />
            <span className="text-foreground">Work Into </span>
            <span className="bg-gradient-to-r from-[#2dd4a8] via-[#6b8de3] to-[#a855f7] bg-clip-text text-transparent">
              30 Minutes.
            </span>
          </h2>
        </AnimateOnScroll>

        <AnimateOnScroll delay={50}>
          <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mb-16 sm:mb-20 leading-relaxed font-light">
            Traditional marketing execution is a coordination problem.
            <br />
            KLYC removes coordination.
          </p>
        </AnimateOnScroll>

        <div className="grid lg:grid-cols-2 gap-6 lg:gap-10">
          {/* Traditional Timeline */}
          <AnimateOnScroll delay={100}>
            <div className="p-6 sm:p-8 rounded-xl border border-border bg-muted/20">
              <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground/60 mb-8">Traditional Marketing</p>
              <div className="space-y-0">
                {traditionalTimeline.map((item, i) => (
                  <div key={i} className="flex gap-4 relative">
                    {/* Vertical line */}
                    {i < traditionalTimeline.length - 1 && (
                      <div className="absolute left-[5px] top-3 w-px h-full bg-muted-foreground/15" />
                    )}
                    <div className="relative z-10 mt-1.5 w-[11px] h-[11px] rounded-full border-2 border-muted-foreground/25 bg-white flex-shrink-0" />
                    <div className="pb-6">
                      <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground/50 mb-1">{item.time}</p>
                      <p className="text-sm sm:text-base text-muted-foreground">{item.label}</p>
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground/50 mt-2 font-light italic">
                Total: 4–6 weeks before momentum even starts.
              </p>
            </div>
          </AnimateOnScroll>

          {/* KLYC Timeline */}
          <AnimateOnScroll delay={200}>
            <div className="p-6 sm:p-8 rounded-xl border border-[#2dd4a8]/25 bg-gradient-to-br from-[#2dd4a8]/[0.04] via-transparent to-[#a855f7]/[0.04]">
              <p className="text-xs font-mono uppercase tracking-widest bg-gradient-to-r from-[#2dd4a8] to-[#a855f7] bg-clip-text text-transparent mb-8">KLYC</p>
              <div className="space-y-0">
                {klycTimeline.map((item, i) => (
                  <div key={i} className="flex gap-4 relative">
                    {/* Vertical gradient line */}
                    {i < klycTimeline.length - 1 && (
                      <div className="absolute left-[5px] top-3 w-px h-full bg-gradient-to-b from-[#2dd4a8]/30 to-[#a855f7]/30" />
                    )}
                    <div
                      className="relative z-10 mt-1.5 w-[11px] h-[11px] rounded-full flex-shrink-0"
                      style={{
                        background: `linear-gradient(135deg, #2dd4a8, #6b8de3, #a855f7)`,
                      }}
                    />
                    <div className="pb-6">
                      <p className="text-xs font-mono uppercase tracking-wider bg-gradient-to-r from-[#2dd4a8] to-[#6b8de3] bg-clip-text text-transparent mb-1">{item.time}</p>
                      <p className="text-sm sm:text-base text-foreground font-medium">{item.label}</p>
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-sm font-medium bg-gradient-to-r from-[#2dd4a8] to-[#a855f7] bg-clip-text text-transparent mt-2">
                Momentum begins immediately.
              </p>
            </div>
          </AnimateOnScroll>
        </div>

        {/* Footer lines */}
        <AnimateOnScroll delay={300}>
          <div className="mt-16 sm:mt-20 space-y-2 text-center">
            <p className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-[#2dd4a8] via-[#6b8de3] to-[#a855f7] bg-clip-text text-transparent">
              Velocity compounds attention.
            </p>
            <p className="text-base sm:text-lg bg-gradient-to-r from-[#2dd4a8] via-[#6b8de3] to-[#a855f7] bg-clip-text text-transparent font-light">
              The faster you publish, the faster you learn.
            </p>
            <p className="text-base sm:text-lg bg-gradient-to-r from-[#2dd4a8] via-[#6b8de3] to-[#a855f7] bg-clip-text text-transparent font-light">
              The faster you learn, the faster you scale.
            </p>
          </div>
        </AnimateOnScroll>
      </div>
    </section>
  );
};

export default LandingSpeed;
