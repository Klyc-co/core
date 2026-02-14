import AnimateOnScroll from "./AnimateOnScroll";
import { Shield } from "lucide-react";

const controls = [
  "Brand guardrails enforced",
  "Tone consistency maintained",
  "Forbidden topics locked",
  "Human veto before publishing",
  "No cross-client learning",
  "Customer-isolated intelligence",
];

const LandingBrandControl = () => {
  return (
    <section className="py-24 sm:py-32 lg:py-40 px-4 sm:px-6 bg-background">
      <div className="max-w-5xl mx-auto">
        <AnimateOnScroll>
          <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-foreground tracking-tight leading-tight mb-12">
            Automation Without Chaos.
          </h2>
        </AnimateOnScroll>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 mb-12">
          {controls.map((item, i) => (
            <AnimateOnScroll key={i} delay={100 + i * 60}>
              <div className="flex items-center gap-3 py-3 px-4 rounded-lg border border-border">
                <Shield className="w-4 h-4 text-primary flex-shrink-0" strokeWidth={1.5} />
                <span className="text-sm sm:text-base text-foreground">{item}</span>
              </div>
            </AnimateOnScroll>
          ))}
        </div>

        <AnimateOnScroll delay={400}>
          <p className="text-lg sm:text-xl text-muted-foreground font-light">
            Infrastructure without loss of control.
          </p>
        </AnimateOnScroll>
      </div>
    </section>
  );
};

export default LandingBrandControl;
