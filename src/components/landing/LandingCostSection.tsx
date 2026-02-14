import AnimateOnScroll from "./AnimateOnScroll";

const traditionalProblems = [
  "Delayed campaigns",
  "Under-leveraged employee networks",
  "Inconsistent messaging",
  "Reactive analytics",
  "Missed amplification windows",
  "Limited distribution velocity",
];

const LandingCostSection = () => {
  return (
    <section className="py-24 sm:py-32 lg:py-40 px-4 sm:px-6 bg-background">
      <div className="max-w-5xl mx-auto">
        <AnimateOnScroll>
          <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-foreground tracking-tight leading-tight mb-6">
            The Hidden Cost Isn't Your Budget.
            <br />
            <span className="text-muted-foreground">It's Lost Momentum.</span>
          </h2>
        </AnimateOnScroll>

        <AnimateOnScroll delay={100}>
          <p className="text-sm font-mono uppercase tracking-widest text-muted-foreground mb-8 mt-16">
            Traditional Marketing Creates
          </p>
        </AnimateOnScroll>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 mb-16">
          {traditionalProblems.map((item, i) => (
            <AnimateOnScroll key={i} delay={150 + i * 50}>
              <div className="flex items-center gap-3 py-3 px-4 rounded-lg border border-border bg-card">
                <span className="w-1.5 h-1.5 rounded-full bg-destructive flex-shrink-0" />
                <span className="text-sm sm:text-base text-foreground">{item}</span>
              </div>
            </AnimateOnScroll>
          ))}
        </div>

        <AnimateOnScroll delay={200}>
          <p className="text-xl sm:text-2xl text-foreground font-medium leading-relaxed mb-16">
            Every delay compounds.
            <br />
            Every missed moment costs reach.
          </p>
        </AnimateOnScroll>

        {/* Timeline comparison */}
        <AnimateOnScroll delay={250}>
          <div className="grid lg:grid-cols-2 gap-6 lg:gap-10">
            {/* Traditional */}
            <div className="p-6 sm:p-8 rounded-xl border border-border bg-muted/30">
              <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground mb-6">Traditional</p>
              <div className="flex flex-wrap gap-2 items-center text-sm text-muted-foreground">
                {["Idea", "Planning", "Review", "Production", "Distribution", "Optimization"].map((step, i) => (
                  <span key={step} className="flex items-center gap-2">
                    <span className="px-2.5 py-1 rounded bg-card border border-border text-foreground text-xs sm:text-sm">{step}</span>
                    {i < 5 && <span className="text-muted-foreground/40">→</span>}
                  </span>
                ))}
              </div>
              <p className="mt-4 text-xs font-mono text-muted-foreground">(weeks pass)</p>
            </div>

            {/* KLYC */}
            <div className="p-6 sm:p-8 rounded-xl border border-primary/30 bg-primary/5">
              <p className="text-xs font-mono uppercase tracking-widest text-primary mb-6">KLYC</p>
              <div className="flex flex-wrap gap-2 items-center text-sm">
                {["Idea", "Distributed Execution", "Velocity Detection", "Amplification"].map((step, i) => (
                  <span key={step} className="flex items-center gap-2">
                    <span className="px-2.5 py-1 rounded bg-primary/10 border border-primary/20 text-foreground text-xs sm:text-sm">{step}</span>
                    {i < 3 && <span className="text-primary/40">→</span>}
                  </span>
                ))}
              </div>
              <p className="mt-4 text-xs font-mono text-primary">(minutes pass)</p>
            </div>
          </div>
        </AnimateOnScroll>
      </div>
    </section>
  );
};

export default LandingCostSection;
