import AnimateOnScroll from "./AnimateOnScroll";

const LandingCostSection = () => {
  return (
    <section className="py-16 sm:py-20 lg:py-24 px-4 sm:px-6 bg-[#08080c]">
      <div className="max-w-4xl mx-auto">
        <AnimateOnScroll>
          <p className="text-xl sm:text-2xl md:text-3xl font-medium text-white/30 mb-4">
            The Hidden Cost Isn't Your Budget.
          </p>
          <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.1] text-white mb-14 sm:mb-20">
            It's Lost Momentum.
          </h2>
        </AnimateOnScroll>

        {/* Two-column contrast */}
        <div className="grid md:grid-cols-2 gap-px bg-white/[0.06] rounded-2xl overflow-hidden mb-20 sm:mb-28">
          {/* Traditional */}
          <AnimateOnScroll delay={100}>
            <div className="bg-[#0e0e14] p-10 sm:p-12 md:p-16 h-full">
              <p className="text-sm sm:text-base md:text-lg font-mono uppercase tracking-[0.3em] text-white/25 mb-10">Without Klyc</p>
              <ul className="space-y-7">
                {[
                  "Weeks between idea and publish",
                  "One brand account, limited reach",
                  "Reactive, fragmented analytics",
                  "Rising cost per post",
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-4">
                    <span className="mt-3 w-1.5 h-1.5 rounded-full bg-white/20 flex-shrink-0" />
                    <span className="text-lg sm:text-xl md:text-2xl text-white/45 leading-relaxed">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </AnimateOnScroll>

          {/* KLYC */}
          <AnimateOnScroll delay={200}>
            <div className="bg-gradient-to-br from-[#2dd4a8] via-[#6b8de3] to-[#a855f7] p-10 sm:p-12 md:p-16 h-full rounded-r-2xl sm:rounded-r-2xl">
              <p className="text-sm sm:text-base md:text-lg font-mono uppercase tracking-[0.3em] text-white/80 mb-10">With Klyc</p>
              <ul className="space-y-7">
                {[
                  "Minutes from idea to distributed publish",
                  "100+ employee accounts as distribution nodes",
                  "Real-time velocity detection & amplification",
                  "Near-zero marginal cost per post",
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-4">
                    <span className="mt-3 w-1.5 h-1.5 rounded-full bg-white flex-shrink-0" />
                    <span className="text-lg sm:text-xl md:text-2xl text-white leading-relaxed">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </AnimateOnScroll>
        </div>

        {/* Closing line */}
        <AnimateOnScroll delay={300}>
          <p className="text-center text-lg sm:text-xl md:text-2xl font-medium text-white/60 leading-relaxed max-w-2xl mx-auto">
            Every delay compounds exponentially. Every missed moment costs market reach.
          </p>
        </AnimateOnScroll>
      </div>
    </section>
  );
};

export default LandingCostSection;
