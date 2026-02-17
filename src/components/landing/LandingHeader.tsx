import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import klycLogo from "@/assets/klyc-logo-transparent.png";

const LandingHeader = () => {
  const navigate = useNavigate();

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-[#e2e5ea]/40">
      <div className="max-w-7xl mx-auto flex items-center justify-between px-4 sm:px-6 py-3">
        <img src={klycLogo} alt="Klyc" className="h-12 sm:h-14" />
        <div className="flex items-center gap-2 sm:gap-3">
          <Button
            onClick={() => navigate("/client/auth")}
            variant="ghost"
            size="sm"
            className="text-[#6b7280] hover:text-[#191a1f] hover:bg-[#ebedf0] text-xs sm:text-sm"
          >
            Client Login
          </Button>
          <Button
            onClick={() => navigate("/auth")}
            variant="ghost"
            size="sm"
            className="text-[#6b7280] hover:text-[#191a1f] hover:bg-[#ebedf0] text-xs sm:text-sm"
          >
            Sign In
          </Button>
          <Button
            onClick={() => navigate("/auth?tab=signup")}
            size="sm"
            className="bg-gradient-to-r from-[#6b5ce7] to-[#a855f7] text-white border-0 text-xs sm:text-sm hover:opacity-90"
          >
            Sign Up
          </Button>
        </div>
      </div>
    </header>
  );
};

export default LandingHeader;
