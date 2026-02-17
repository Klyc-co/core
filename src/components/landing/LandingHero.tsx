import { useNavigate } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import NetworkGraph from "./NetworkGraph";
import klycLogo from "@/assets/klyc-logo.png";

const LandingHero = () => {
  const navigate = useNavigate();

  const scrollToHowItWorks = () => {
    document.getElementById("execution-speed")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section className="relative min-h-screen flex flex-col justify-center px-4 sm:px-6 bg-white overflow-hidden pt-14">
      <NetworkGraph />

      <div className="relative z-10 max-w-5xl mx-auto text-center py-32 sm:py-0">
        <img src={klycLogo} alt="Klyc" className="h-32 sm:h-40 md:h-56 mx-auto mb-8 sm:mb-12" />
        
        <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.1] mb-5 sm:mb-6">
          <span className="bg-gradient-to-r from-[#2dd4a8] via-[#6b8de3] to-[#a855f7] bg-clip-text text-transparent">Plan. Create. Publish. Optimize.</span>
        </h1>

        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center">
          <Button
            size="lg"
            onClick={() => navigate("/auth")}
            className="bg-gradient-to-r from-[#6b5ce7] to-[#a855f7] text-white border-0 px-8 sm:px-10 py-6 text-base sm:text-lg rounded-lg font-medium hover:opacity-90"
          >
            Activate Klyc
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
          <Button
            size="lg"
            variant="ghost"
            onClick={scrollToHowItWorks}
            className="text-[#6b7280] hover:text-[#191a1f] hover:bg-[#ebedf0] px-8 py-6 text-base sm:text-lg rounded-lg"
          >
            See How It Works
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 opacity-40">
        <div className="w-px h-10 bg-gradient-to-b from-transparent to-[#191a1f]" />
      </div>
    </section>
  );
};

export default LandingHero;
