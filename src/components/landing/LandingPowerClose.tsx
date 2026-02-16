import { useNavigate } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import klycLogo from "@/assets/klyc-logo.png";

const LandingPowerClose = () => {
  const navigate = useNavigate();

  return (
    <>
      <section className="py-24 sm:py-32 lg:py-40 px-4 sm:px-6 bg-background">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-foreground tracking-tight leading-tight mb-10">
            Stop Managing Marketing.
            <br />
            <span
              className="bg-clip-text text-transparent"
              style={{ backgroundImage: "linear-gradient(135deg, #2dd4a8, #6b8de3, #a855f7)" }}
            >
              Start Owning Attention.
            </span>
          </h2>

          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center">
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
      <footer className="py-6 sm:py-8 px-4 sm:px-6 bg-foreground border-t border-primary-foreground/10">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <img src={klycLogo} alt="Klyc" className="h-5 sm:h-6 brightness-0 invert" />
          <div className="flex items-center gap-4 sm:gap-6 text-xs sm:text-sm text-primary-foreground/40">
            <a href="/terms" className="hover:text-primary-foreground/70 transition-colors">Terms</a>
            <span className="text-primary-foreground/20">|</span>
            <a href="/privacy" className="hover:text-primary-foreground/70 transition-colors">Privacy</a>
            <span className="text-primary-foreground/20">|</span>
            <a href="/admin/login" className="hover:text-primary-foreground/70 transition-colors">Admin</a>
          </div>
          <p className="text-primary-foreground/30 text-xs sm:text-sm">
            © {new Date().getFullYear()} Klyc
          </p>
        </div>
      </footer>
    </>
  );
};

export default LandingPowerClose;
