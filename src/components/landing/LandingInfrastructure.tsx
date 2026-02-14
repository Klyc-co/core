import AnimateOnScroll from "./AnimateOnScroll";
import { Database, Brain, Send } from "lucide-react";

const layers = [
  {
    icon: Database,
    title: "Intelligence Layer",
    description: "Brand memory, audience data, positioning, tone, competitors, performance history.",
  },
  {
    icon: Brain,
    title: "Decision + Creation Layer",
    description: "AI orchestrates strategy, selects angles, applies psychological frameworks, generates native platform content.",
  },
  {
    icon: Send,
    title: "Operations + Distribution Layer",
    description: "Scheduling, publishing, employee enablement, velocity tracking, amplification timing.",
  },
];

const LandingInfrastructure = () => {
  return (
    <section className="py-24 sm:py-32 lg:py-40 px-4 sm:px-6 bg-foreground text-primary-foreground">
      <div className="max-w-5xl mx-auto">
        <AnimateOnScroll>
          <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight leading-tight mb-4">
            Stop Hiring Output.
            <br />
            <span className="text-primary">Start Building Infrastructure.</span>
          </h2>
        </AnimateOnScroll>

        <AnimateOnScroll delay={100}>
          <p className="text-base sm:text-lg text-primary-foreground/50 max-w-2xl mb-16 sm:mb-20 leading-relaxed font-light">
            Most companies scale marketing by adding people.
            <br />
            KLYC scales marketing by adding systems.
          </p>
        </AnimateOnScroll>

        <div className="grid md:grid-cols-3 gap-px bg-primary-foreground/10 rounded-xl overflow-hidden">
          {layers.map((layer, i) => (
            <AnimateOnScroll key={i} delay={150 + i * 100}>
              <div className="bg-foreground p-8 sm:p-10 h-full flex flex-col">
                <layer.icon className="w-5 h-5 text-primary mb-6" strokeWidth={1.5} />
                <h3 className="text-lg sm:text-xl font-semibold text-primary-foreground mb-3">
                  {layer.title}
                </h3>
                <p className="text-sm sm:text-base text-primary-foreground/50 leading-relaxed font-light">
                  {layer.description}
                </p>
              </div>
            </AnimateOnScroll>
          ))}
        </div>
      </div>
    </section>
  );
};

export default LandingInfrastructure;
