import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import klycLogo from "@/assets/klyc-logo-transparent.png";

const NAV_LINKS = [
  { label: "Features", href: "#features" },
  { label: "How it works", href: "#how-it-works" },
  { label: "About", href: "#about" },
  { label: "FAQ", href: "#faq" },
  { label: "Contact", href: "#contact" },
];

const LandingHeader = () => {
  const navigate = useNavigate();

  const handleAnchor = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    e.preventDefault();
    const id = href.replace("#", "");
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
      history.replaceState(null, "", href);
    }
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-[#e2e5ea]/40">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4 px-4 sm:px-6 py-3">
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          className="flex-shrink-0"
          aria-label="Klyc home"
        >
          <img src={klycLogo} alt="Klyc" className="h-12 sm:h-14" />
        </button>

        <nav className="hidden lg:flex items-center gap-7" aria-label="Primary">
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              onClick={(e) => handleAnchor(e, link.href)}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2 sm:gap-3">
          <Button
            onClick={() => navigate("/auth")}
            variant="ghost"
            size="sm"
            className="text-muted-foreground hover:text-foreground hover:bg-secondary text-xs sm:text-sm"
          >
            Sign In
          </Button>
          <Button
            onClick={() => navigate("/waitlist")}
            size="sm"
            className="bg-gradient-to-r from-[#6b5ce7] to-[#a855f7] text-white border-0 text-xs sm:text-sm hover:opacity-90"
          >
            Waitlist
          </Button>
        </div>
      </div>
    </header>
  );
};

export default LandingHeader;
