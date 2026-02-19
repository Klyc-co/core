import AnimateOnScroll from "./AnimateOnScroll";

const LandingCostSection = () => {
  return (
    <section className="grid md:grid-cols-2">
      {/* With Klyc */}
      <AnimateOnScroll>
        <div className="bg-gradient-to-br from-[#2dd4a8] via-[#6b8de3] to-[#a855f7] p-10 sm:p-12 md:p-16 lg:p-20 h-full">
          <p className="text-sm sm:text-base font-mono uppercase tracking-[0.3em] text-white/80 mb-10">With Klyc</p>
          <ul className="space-y-7">
            {[
              "Minutes from idea to distributed publish",
              "100+ employee accounts as distribution nodes",
              "Real-time velocity detection & amplification",
            ].map((item, i) => (
              <li key={i} className="flex items-start gap-4">
                <span className="mt-3 w-1.5 h-1.5 rounded-full bg-white flex-shrink-0" />
                <span className="text-lg sm:text-xl md:text-2xl text-white leading-relaxed">{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </AnimateOnScroll>

      {/* Without Klyc */}
      <AnimateOnScroll delay={100}>
        <div className="bg-[#0e0e14] p-10 sm:p-12 md:p-16 lg:p-20 h-full">
          <p className="text-sm sm:text-base font-mono uppercase tracking-[0.3em] text-white/25 mb-10">Without Klyc</p>
          <ul className="space-y-7">
            {[
              "Weeks between idea and publish",
              "One brand account, limited reach",
              "Reactive, fragmented analytics",
            ].map((item, i) => (
              <li key={i} className="flex items-start gap-4">
                <span className="mt-3 w-1.5 h-1.5 rounded-full bg-white/20 flex-shrink-0" />
                <span className="text-lg sm:text-xl md:text-2xl text-white/45 leading-relaxed">{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </AnimateOnScroll>
    </section>
  );
};

export default LandingCostSection;
