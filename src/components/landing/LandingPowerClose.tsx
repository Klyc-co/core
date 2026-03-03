import { useNavigate } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import klycMascot from "@/assets/klyc-mascot-thumbsup.png";
import klycLogo from "@/assets/klyc-logo-transparent.png";

const LandingPowerClose = () => {
  const navigate = useNavigate();

  return (
    <>
      <section className="py-10 sm:py-14 lg:py-16 px-4 sm:px-6 bg-white">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight leading-tight mb-2">
            <span
              className="bg-clip-text text-transparent"
              style={{ backgroundImage: "linear-gradient(135deg, #2dd4a8, #6b8de3, #a855f7)" }}
            >
              "Unlock Infinite Attention."
            </span>
          </h2>
          <img src={klycMascot} alt="Klyc mascot" className="h-[34rem] sm:h-[40rem] mx-auto -my-4" />

          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center mt-2">
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
              className="text-[#6b7280] hover:text-[#191a1f] hover:bg-[#ebedf0] px-8 py-6 text-base sm:text-lg rounded-lg"
            >
              Book Strategy Call
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 sm:py-10 px-4 sm:px-6 bg-white border-t border-[#e2e5ea]">
        <div className="max-w-7xl mx-auto flex flex-col items-center gap-6">
          <img src={klycLogo} alt="Klyc" className="h-12 sm:h-14" />
          <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 text-sm text-[#6b7280]">
            <a href="/terms" className="hover:text-[#191a1f] transition-colors font-medium">Terms of Service</a>
            <span className="text-[#e2e5ea]">|</span>
            <a href="/privacy" className="hover:text-[#191a1f] transition-colors font-medium">Privacy Policy</a>
            <span className="text-[#e2e5ea]">|</span>
            <a href="/admin/login" className="hover:text-[#191a1f] transition-colors">Admin</a>
          </div>
          <p className="text-[#6b7280]/60 text-xs sm:text-sm">
            © {new Date().getFullYear()} Klyc. All rights reserved.
          </p>
        </div>
      </footer>
    </>
  );
};

export default LandingPowerClose;
