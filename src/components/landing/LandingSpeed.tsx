import AnimateOnScroll from "./AnimateOnScroll";

const LandingSpeed = () => {
  return (
    <section id="execution-speed" className="relative py-24 sm:py-32 lg:py-40 px-4 sm:px-6 bg-[#08080c] overflow-hidden">
      {/* Ambient gradient orbs */}
      <div className="absolute top-1/4 -left-32 w-96 h-96 bg-[#2dd4a8]/10 rounded-full blur-[120px] animate-pulse" />
      <div className="absolute bottom-1/4 right-0 w-80 h-80 bg-[#a855f7]/10 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: "1s" }} />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 w-64 h-64 bg-[#6b8de3]/8 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: "2s" }} />

      <div className="relative z-10 max-w-5xl mx-auto">
        <AnimateOnScroll>
          <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight leading-tight mb-6">
            <span className="text-white">Weeks to Plan.</span>
            <br />
            <span className="bg-gradient-to-r from-[#2dd4a8] via-[#6b8de3] to-[#a855f7] bg-clip-text text-transparent">
              Minutes to Deploy.
            </span>
          </h2>
        </AnimateOnScroll>

        <div className="grid lg:grid-cols-2 gap-6 lg:gap-10 mt-12 sm:mt-16">
          <AnimateOnScroll delay={100}>
            <div className="p-6 sm:p-8 rounded-xl border border-white/[0.06] bg-white/[0.03] backdrop-blur-sm">
              <p className="text-xs font-mono uppercase tracking-widest text-white/30 mb-6">Traditional Marketing</p>
              <ul className="space-y-3">
                {["Strategy meetings", "Content calendars", "Asset coordination", "Manual scheduling"].map((item) => (
                  <li key={item} className="flex items-center gap-3 text-sm sm:text-base text-white/40">
                    <span className="w-1 h-1 rounded-full bg-white/20" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </AnimateOnScroll>

          <AnimateOnScroll delay={200}>
            <div className="p-6 sm:p-8 rounded-xl border border-[#2dd4a8]/30 bg-gradient-to-br from-[#2dd4a8]/10 via-[#6b8de3]/5 to-[#a855f7]/10 backdrop-blur-sm">
              <p className="text-xs font-mono uppercase tracking-widest bg-gradient-to-r from-[#2dd4a8] to-[#a855f7] bg-clip-text text-transparent mb-6">KLYC</p>
              <ul className="space-y-3">
                {[
                  "Campaign defined",
                  "AI generates platform-native content",
                  "Distributed scheduling",
                  "Performance tracking begins immediately",
                ].map((item) => (
                  <li key={item} className="flex items-center gap-3 text-sm sm:text-base text-white">
                    <span className="w-1.5 h-1.5 rounded-full bg-gradient-to-r from-[#2dd4a8] to-[#a855f7]" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </AnimateOnScroll>
        </div>

        <AnimateOnScroll delay={300}>
          <p className="mt-16 text-xl sm:text-2xl font-medium bg-gradient-to-r from-[#2dd4a8] via-[#6b8de3] to-[#a855f7] bg-clip-text text-transparent">
            Velocity compounds attention.
          </p>
        </AnimateOnScroll>
      </div>
    </section>
  );
};

export default LandingSpeed;
