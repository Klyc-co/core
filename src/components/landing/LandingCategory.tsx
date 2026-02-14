import AnimateOnScroll from "./AnimateOnScroll";
import { ArrowRight } from "lucide-react";

const LandingCategory = () => {
  return (
    <section className="py-24 sm:py-32 lg:py-40 px-4 sm:px-6 bg-background">
      <div className="max-w-4xl mx-auto">
        <AnimateOnScroll>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4 text-xl sm:text-2xl md:text-3xl font-mono text-muted-foreground mb-8">
            <span>AI Content Tool</span>
            <ArrowRight className="w-5 h-5 hidden sm:block" />
            <span>AI Content OS</span>
            <ArrowRight className="w-5 h-5 hidden sm:block" />
            <span className="text-foreground font-bold">AI Visibility Infrastructure</span>
          </div>
        </AnimateOnScroll>

        <AnimateOnScroll delay={150}>
          <p className="text-base sm:text-lg text-muted-foreground max-w-2xl leading-relaxed font-light">
            Marketing is shifting from human-driven execution to system-driven amplification.
            KLYC is building the infrastructure layer for attention.
          </p>
        </AnimateOnScroll>
      </div>
    </section>
  );
};

export default LandingCategory;
