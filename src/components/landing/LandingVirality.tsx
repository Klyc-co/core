import AnimateOnScroll from "./AnimateOnScroll";

const checkpoints = ["1 min", "5 min", "15 min", "30 min", "1 hr", "2 hr"];

const LandingVirality = () => {
  return (
    <section className="py-24 sm:py-32 lg:py-40 px-4 sm:px-6 bg-background">
      <div className="max-w-5xl mx-auto">
        <AnimateOnScroll>
          <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-foreground tracking-tight leading-tight mb-6">
            We Don't Guess.
            <br />
            <span className="text-muted-foreground">We Measure Acceleration.</span>
          </h2>
        </AnimateOnScroll>

        <AnimateOnScroll delay={100}>
          <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground mb-8 mt-12">
            Performance Checkpoints
          </p>
        </AnimateOnScroll>

        <AnimateOnScroll delay={150}>
          <div className="flex flex-wrap gap-2 sm:gap-3 mb-12">
            {checkpoints.map((cp, i) => (
              <div
                key={cp}
                className="px-4 py-2.5 rounded-lg border border-border bg-card text-sm font-mono text-foreground"
                style={{ opacity: 0.5 + i * 0.1 }}
              >
                {cp}
              </div>
            ))}
          </div>
        </AnimateOnScroll>

        <AnimateOnScroll delay={200}>
          <div className="p-6 sm:p-8 rounded-xl border border-primary/30 bg-primary/5 max-w-2xl">
            <p className="text-xs font-mono uppercase tracking-widest text-primary mb-4">
              If velocity exceeds baseline
            </p>
            <ul className="space-y-2.5">
              {[
                "→ Alert triggered",
                "→ Amplification recommended",
                "→ Momentum captured while rising",
              ].map((item) => (
                <li key={item} className="text-sm sm:text-base text-foreground font-medium">{item}</li>
              ))}
            </ul>
          </div>
        </AnimateOnScroll>

        <AnimateOnScroll delay={250}>
          <p className="mt-12 text-base sm:text-lg text-muted-foreground font-light italic">
            This is execution timing — not hope.
          </p>
        </AnimateOnScroll>
      </div>
    </section>
  );
};

export default LandingVirality;
