import { Link } from "react-router-dom";
import klycLogo from "@/assets/klyc-logo-transparent.png";

const FOOTER_SECTIONS = [
  {
    title: "Product",
    links: [
      { label: "Features", href: "#features" },
      { label: "How it works", href: "#how-it-works" },
      { label: "Pricing", href: "#pricing" },
      { label: "FAQ", href: "#faq" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About", href: "#about" },
      { label: "Team", to: "/team" },
      { label: "Contact", href: "#contact" },
      { label: "Waitlist", to: "/waitlist" },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Privacy Policy", to: "/privacy" },
      { label: "Terms of Service", to: "/terms" },
      { label: "Data Deletion", to: "/data-deletion" },
    ],
  },
];

const handleAnchor = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
  e.preventDefault();
  const id = href.replace("#", "");
  const el = document.getElementById(id);
  if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
};

const LandingFooter = () => {
  return (
    <footer className="bg-[#0d0d12] text-white py-16 px-4 sm:px-6">
      <div className="max-w-7xl mx-auto">
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-5 mb-12">
          <div className="lg:col-span-2">
            <img src={klycLogo} alt="Klyc" className="h-12 mb-4 brightness-0 invert" />
            <p className="text-sm text-white/60 leading-relaxed max-w-sm">
              Klyc is the autonomous marketing platform for modern brands.
              Plan, create, publish, and optimize across every channel — from one workspace.
            </p>
            <p className="text-xs text-white/40 mt-6">
              © {new Date().getFullYear()} Cipher Stream, Inc. All rights reserved.
            </p>
          </div>

          {FOOTER_SECTIONS.map((section) => (
            <div key={section.title}>
              <h4 className="text-sm font-semibold text-white mb-4">{section.title}</h4>
              <ul className="space-y-2.5">
                {section.links.map((link) => (
                  <li key={link.label}>
                    {"to" in link && link.to ? (
                      <Link
                        to={link.to}
                        className="text-sm text-white/60 hover:text-white transition-colors"
                      >
                        {link.label}
                      </Link>
                    ) : (
                      <a
                        href={link.href}
                        onClick={(e) => link.href && handleAnchor(e, link.href)}
                        className="text-sm text-white/60 hover:text-white transition-colors"
                      >
                        {link.label}
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="border-t border-white/10 pt-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <p className="text-xs text-white/40">
            Built with care from the United States.
          </p>
          <div className="flex items-center gap-5">
            <a
              href="mailto:hello@klyc.ai"
              className="text-xs text-white/60 hover:text-white transition-colors"
            >
              hello@klyc.ai
            </a>
            <Link to="/privacy" className="text-xs text-white/60 hover:text-white transition-colors">
              Privacy
            </Link>
            <Link to="/terms" className="text-xs text-white/60 hover:text-white transition-colors">
              Terms
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default LandingFooter;
