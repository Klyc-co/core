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
    <section className="relative min-h-screen flex flex-col justify-center px-4 sm:px-6 bg-background text-foreground overflow-hidden">
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
        <img src={klycLogo} alt="Klyc" className="h-12 sm:h-16 md:h-20 mx-auto mb-10 sm:mb-14" />
        
        <h1 className="text-4xl sm:text-5xl md:text-7xl lg:text-8xl font-bold tracking-tight leading-[1.05] mb-6 sm:mb-8 text-foreground">
          Reach Like a 20-Person Team.
          <br />
          <span className="text-primary">Operate Like a 3-Person One.</span>
        </h1>

        <p className="text-base sm:text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto mb-10 sm:mb-14 leading-relaxed font-light">
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
