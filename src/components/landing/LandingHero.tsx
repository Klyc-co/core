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
    <section className="relative min-h-screen flex flex-col justify-center px-4 sm:px-6 bg-white text-foreground overflow-hidden">
      <NetworkGraph />
      
      {/* Nav */}
      <nav className="absolute top-0 left-0 right-0 z-10 px-4 sm:px-6 py-5 sm:py-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <img src={klycLogo} alt="Klyc" className="h-6 sm:h-7" />
          <div className="flex items-center gap-2 sm:gap-4">
            <Button
              onClick={() => navigate("/client/auth")}
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-foreground hover:bg-muted text-xs sm:text-sm"
            >
              Client Login
            </Button>
            <Button
              onClick={() => navigate("/auth")}
              variant="outline"
              size="sm"
              className="border-border text-foreground hover:bg-muted text-xs sm:text-sm"
            >
              Sign In
            </Button>
          </div>
        </div>
      </nav>

      <div className="relative z-10 max-w-5xl mx-auto text-center py-32 sm:py-0">
        <img src={klycLogo} alt="Klyc" className="h-32 sm:h-40 md:h-56 mx-auto mb-8 sm:mb-12" />
        
        <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.1] mb-5 sm:mb-6 text-foreground">
          Reach Like a 20-Person Team.
          <br />
          <span className="bg-gradient-to-r from-[#2dd4a8] via-[#6b8de3] to-[#a855f7] bg-clip-text text-transparent">Operate Like a 3-Person Team.</span>
        </h1>

        <p className="text-sm sm:text-base md:text-lg text-muted-foreground max-w-2xl mx-auto mb-8 sm:mb-12 leading-relaxed font-light">
          KLYC multiplies Marketing execution without multiplying complexity.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center">
          <Button
            size="lg"
            onClick={() => navigate("/auth")}
            className="bg-primary text-primary-foreground px-8 sm:px-10 py-6 text-base sm:text-lg rounded-lg font-medium"
          >
            Build My Visibility System
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
          <Button
            size="lg"
            variant="ghost"
            onClick={scrollToHowItWorks}
            className="text-muted-foreground hover:text-foreground hover:bg-muted px-8 py-6 text-base sm:text-lg rounded-lg"
          >
            See How It Works
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 opacity-40">
        <div className="w-px h-10 bg-gradient-to-b from-transparent to-foreground" />
      </div>
    </section>
  );
};

export default LandingHero;
