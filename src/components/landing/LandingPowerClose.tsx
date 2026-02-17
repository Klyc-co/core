import { useNavigate } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import klycLogo from "@/assets/klyc-logo-transparent.png";

const LandingPowerClose = () => {
  const navigate = useNavigate();

  return (
    <>
      <section className="py-10 sm:py-14 lg:py-16 px-4 sm:px-6 bg-white">
        <div className="max-w-4xl mx-auto text-center">
          <img src={klycLogo} alt="Klyc" className="h-[28rem] sm:h-[32rem] mx-auto mb-4" />
          <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight leading-tight mb-10">
            <span
              className="bg-clip-text text-transparent"
              style={{ backgroundImage: "linear-gradient(135deg, #2dd4a8, #6b8de3, #a855f7)" }}
            >
              Start Owning Attention.
            </span>
          </h2>

          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center mt-6">
            <Button
              size="lg"
              onClick={() => navigate("/auth")}
              className="px-8 sm:px-10 py-6 text-base sm:text-lg rounded-lg font-medium text-white border-0"
              style={{ background: "linear-gradient(135deg, #2dd4a8, #6b8de3)" }}
            >
              Build My Visibility System
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            <Button
              size="lg"
              variant="ghost"
              className="text-muted-foreground hover:text-foreground hover:bg-muted px-8 py-6 text-base sm:text-lg rounded-lg"
            >
              Book Strategy Call
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-6 sm:py-8 px-4 sm:px-6 bg-background border-t border-border">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <img src={klycLogo} alt="Klyc" className="h-12 sm:h-14" />
          <div className="flex items-center gap-4 sm:gap-6 text-xs sm:text-sm text-muted-foreground">
            <a href="/terms" className="hover:text-foreground transition-colors">Terms</a>
            <span className="text-border">|</span>
            <a href="/privacy" className="hover:text-foreground transition-colors">Privacy</a>
            <span className="text-border">|</span>
            <a href="/admin/login" className="hover:text-foreground transition-colors">Admin</a>
          </div>
          <p className="text-muted-foreground/60 text-xs sm:text-sm">
            © {new Date().getFullYear()} Klyc
          </p>
        </div>
      </footer>
    </>
  );
};

export default LandingPowerClose;
