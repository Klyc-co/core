import AnimateOnScroll from "./AnimateOnScroll";

const LandingCostSection = () => {
  return (
    <section className="py-28 sm:py-36 lg:py-44 px-4 sm:px-6 bg-[#08080c]">
      <div className="max-w-4xl mx-auto">
        <AnimateOnScroll>
          <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.1] text-white mb-6">
            The Hidden Cost Isn't
            <br />
            Your Budget.
          </h2>
          <p className="text-xl sm:text-2xl md:text-3xl font-medium text-white/30 mb-20 sm:mb-28">
            It's lost momentum.
          </p>
        </AnimateOnScroll>

        {/* Two-column contrast */}
        <div className="grid md:grid-cols-2 gap-px bg-white/[0.06] rounded-2xl overflow-hidden mb-20 sm:mb-28">
          {/* Traditional */}
          <AnimateOnScroll delay={100}>
            <div className="bg-[#0e0e14] p-8 sm:p-10 md:p-12 h-full">
              <p className="text-[11px] font-mono uppercase tracking-[0.3em] text-white/25 mb-8">Without infrastructure</p>
              <ul className="space-y-5">
                {[
                  "Weeks between idea and publish",
                  "One brand account, limited reach",
                  "Reactive, fragmented analytics",
                  "Rising cost per post",
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <span className="mt-2 w-1 h-1 rounded-full bg-white/20 flex-shrink-0" />
                    <span className="text-sm sm:text-base text-white/45 leading-relaxed">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </AnimateOnScroll>

          {/* KLYC */}
          <AnimateOnScroll delay={200}>
            <div className="bg-[#0e0e14] p-8 sm:p-10 md:p-12 h-full">
              <p className="text-[11px] font-mono uppercase tracking-[0.3em] text-[#2dd4a8]/70 mb-8">With Klyc</p>
              <ul className="space-y-5">
                {[
                  "Minutes from idea to distributed publish",
                  "100+ employee accounts as distribution nodes",
                  "Real-time velocity detection & amplification",
                  "Near-zero marginal cost per post",
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <span className="mt-2 w-1 h-1 rounded-full bg-[#2dd4a8] flex-shrink-0" />
                    <span className="text-sm sm:text-base text-white/80 leading-relaxed">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </AnimateOnScroll>
        </div>

        {/* Closing line */}
        <AnimateOnScroll delay={300}>
          <p className="text-center text-lg sm:text-xl md:text-2xl font-medium text-white/60 leading-relaxed max-w-2xl mx-auto">
            Every delay compounds.
            <span className="text-white/20"> Every missed moment costs reach.</span>
          </p>
        </AnimateOnScroll>
      </div>
    </section>
  );
};

export default LandingCostSection;
