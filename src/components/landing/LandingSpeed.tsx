import AnimateOnScroll from "./AnimateOnScroll";

const LandingSpeed = () => {
  return (
    <section id="execution-speed" className="py-24 sm:py-32 lg:py-40 px-4 sm:px-6 bg-foreground text-primary-foreground">
      <div className="max-w-5xl mx-auto">
        <AnimateOnScroll>
          <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight leading-tight mb-6">
            Weeks to Plan.
            <br />
            <span className="text-primary">Minutes to Deploy.</span>
          </h2>
        </AnimateOnScroll>

        <div className="grid lg:grid-cols-2 gap-6 lg:gap-10 mt-12 sm:mt-16">
          <AnimateOnScroll delay={100}>
            <div className="p-6 sm:p-8 rounded-xl border border-primary-foreground/10">
              <p className="text-xs font-mono uppercase tracking-widest text-primary-foreground/40 mb-6">Traditional Marketing</p>
              <ul className="space-y-3">
                {["Strategy meetings", "Content calendars", "Asset coordination", "Manual scheduling"].map((item) => (
                  <li key={item} className="flex items-center gap-3 text-sm sm:text-base text-primary-foreground/60">
                    <span className="w-1 h-1 rounded-full bg-primary-foreground/30" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </AnimateOnScroll>

          <AnimateOnScroll delay={200}>
            <div className="p-6 sm:p-8 rounded-xl border border-primary/30 bg-primary/5">
              <p className="text-xs font-mono uppercase tracking-widest text-primary mb-6">KLYC</p>
              <ul className="space-y-3">
                {[
                  "Campaign defined",
                  "AI generates platform-native content",
                  "Distributed scheduling",
                  "Performance tracking begins immediately",
                ].map((item) => (
                  <li key={item} className="flex items-center gap-3 text-sm sm:text-base text-primary-foreground">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </AnimateOnScroll>
        </div>

        <AnimateOnScroll delay={300}>
          <p className="mt-16 text-xl sm:text-2xl font-medium text-primary-foreground/80">
            Velocity compounds attention.
          </p>
        </AnimateOnScroll>
      </div>
    </section>
  );
};

export default LandingSpeed;
