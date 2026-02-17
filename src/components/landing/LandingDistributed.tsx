import { useNavigate } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import AnimateOnScroll from "./AnimateOnScroll";

const LandingDistributed = () => {
  const navigate = useNavigate();

  return (
    <section className="py-24 sm:py-32 lg:py-40 px-4 sm:px-6 bg-[#191a1f] text-white">
      <div className="max-w-5xl mx-auto">
        <AnimateOnScroll>
          <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.1] mb-16 sm:mb-20">
            <span
              className="bg-clip-text text-transparent"
              style={{ backgroundImage: "linear-gradient(135deg, #2dd4a8, #6b8de3, #a855f7)" }}
            >
              KLYC
            </span>
            <span className="text-white font-light"> turns Employees, Leadership, and Sales team into synchronized visibility.</span>
          </h2>
        </AnimateOnScroll>

        <AnimateOnScroll delay={150}>
          <div className="my-0 p-8 sm:p-12 rounded-2xl border border-white/[0.06] bg-white/[0.03]">
            <p className="text-lg sm:text-xl md:text-2xl text-white/70 font-light leading-relaxed mb-8">
              When <span className="font-semibold text-white">100 employees</span> publish instead of 1 brand account:
            </p>
            <p className="text-3xl sm:text-4xl md:text-5xl font-mono font-bold text-white mb-2">
              100 × 2,000 = <span className="bg-gradient-to-r from-[#2dd4a8] via-[#6b8de3] to-[#a855f7] bg-clip-text text-transparent">200,000</span>
            </p>
            <p className="text-sm sm:text-base text-white/30 font-mono mb-10">
              organic distribution nodes per cycle
            </p>
            <p className="text-lg sm:text-xl md:text-2xl text-white/80 font-medium">
              This isn't one post. It's network effect.
            </p>
            <p className="text-base sm:text-lg text-white/50 font-light mt-4">
              Attention compounds when people publish — not logos.
            </p>
          </div>
        </AnimateOnScroll>

        <AnimateOnScroll delay={250}>
          <div className="mt-14">
            <Button
              size="lg"
              onClick={() => navigate("/auth")}
              className="bg-gradient-to-r from-[#2dd4a8] to-[#6b8de3] text-white px-8 py-6 text-base rounded-lg font-medium border-0 hover:opacity-90"
            >
              Activate Distributed Publishing
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </div>
        </AnimateOnScroll>
      </div>
    </section>
  );
};

export default LandingDistributed;
