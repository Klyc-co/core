import { useNavigate } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import AnimateOnScroll from "./AnimateOnScroll";

const LandingDistributed = () => {
  const navigate = useNavigate();

  return (
    <section className="py-24 sm:py-32 lg:py-40 px-4 sm:px-6 bg-background">
      <div className="max-w-5xl mx-auto">
        <AnimateOnScroll>
          <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-foreground tracking-tight leading-tight mb-6">
            One Brand Account Is Reach.
            <br />
            <span className="text-muted-foreground">Distributed Accounts Are Force.</span>
          </h2>
        </AnimateOnScroll>

        <AnimateOnScroll delay={100}>
          <div className="my-12 sm:my-16 p-6 sm:p-10 rounded-xl border border-border bg-card">
            <p className="text-lg sm:text-xl md:text-2xl text-foreground font-light leading-relaxed">
              When <span className="font-semibold text-primary">100 employees</span> publish instead of 1 brand account:
            </p>
            <p className="mt-4 text-2xl sm:text-3xl md:text-4xl font-mono font-bold text-foreground">
              100 × 2,000 = <span className="text-primary">200,000</span>
            </p>
            <p className="mt-2 text-sm text-muted-foreground font-mono">
              organic distribution nodes per cycle
            </p>
          </div>
        </AnimateOnScroll>

        <AnimateOnScroll delay={150}>
          <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mb-10 leading-relaxed">
            KLYC turns your company into a distributed media network.
          </p>
        </AnimateOnScroll>

        {/* Visual: distributed nodes */}
        <AnimateOnScroll delay={200}>
          <div className="relative h-32 sm:h-40 mb-12 flex items-center justify-center">
            <svg viewBox="0 0 600 120" className="w-full max-w-lg h-full text-foreground" fill="none">
              {/* Central node */}
              <circle cx="300" cy="60" r="6" fill="currentColor" className="opacity-80" />
              {/* Distributed nodes */}
              {Array.from({ length: 24 }).map((_, i) => {
                const angle = (i / 24) * Math.PI * 2;
                const r1 = 35 + (i % 3) * 15;
                const cx = 300 + Math.cos(angle) * r1;
                const cy = 60 + Math.sin(angle) * r1;
                return (
                  <g key={i}>
                    <line x1="300" y1="60" x2={cx} y2={cy} stroke="currentColor" strokeWidth="0.5" opacity="0.2" />
                    <circle cx={cx} cy={cy} r={2} fill="currentColor" opacity={0.3 + (i % 4) * 0.1} />
                  </g>
                );
              })}
            </svg>
          </div>
        </AnimateOnScroll>

        <AnimateOnScroll delay={250}>
          <Button
            size="lg"
            onClick={() => navigate("/auth")}
            className="bg-foreground text-background hover:bg-foreground/90 px-8 py-6 text-base rounded-lg font-medium"
          >
            Activate Distributed Publishing
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </AnimateOnScroll>
      </div>
    </section>
  );
};

export default LandingDistributed;
