import AnimateOnScroll from "./AnimateOnScroll";

const audiences = [
  { title: "Founders & Growth Teams", line: "Replace your marketing stack with one system." },
  { title: "Enterprise Marketing", line: "Distribute at scale without adding headcount." },
  { title: "Agencies", line: "Multiply client output without multiplying cost." },
  { title: "Distributed Sales Teams", line: "Turn every rep into a content channel." },
  { title: "Creator Brands", line: "Systematize what made you grow." },
];

const LandingBuiltFor = () => {
  return (
    <section className="py-24 sm:py-32 lg:py-40 px-4 sm:px-6 bg-foreground text-primary-foreground">
      <div className="max-w-5xl mx-auto">
        <AnimateOnScroll>
          <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight leading-tight mb-16">
            Built for Teams That Want Scale —
            <br />
            <span className="text-primary">Not Content.</span>
          </h2>
        </AnimateOnScroll>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-px bg-primary-foreground/10 rounded-xl overflow-hidden">
          {audiences.map((a, i) => (
            <AnimateOnScroll key={i} delay={100 + i * 80}>
              <div className="bg-foreground p-6 sm:p-8 h-full">
                <h3 className="text-base sm:text-lg font-semibold text-primary-foreground mb-2">{a.title}</h3>
                <p className="text-sm text-primary-foreground/50 font-light">{a.line}</p>
              </div>
            </AnimateOnScroll>
          ))}
        </div>
      </div>
    </section>
  );
};

export default LandingBuiltFor;
