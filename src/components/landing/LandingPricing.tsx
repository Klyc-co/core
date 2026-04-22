import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

const TIERS = [
  {
    name: "Starter",
    price: "$99",
    cadence: "/month",
    description: "For solo founders validating their first marketing motion.",
    features: [
      "1 brand workspace",
      "Up to 30 AI-generated posts / month",
      "TikTok, Instagram, X, LinkedIn publishing",
      "Basic analytics dashboard",
      "Email support",
    ],
    cta: "Start with Starter",
    highlighted: false,
  },
  {
    name: "Growth",
    price: "$350",
    cadence: "/month",
    description: "For lean teams scaling content across multiple channels.",
    features: [
      "3 brand workspaces",
      "Up to 200 AI-generated posts / month",
      "Strategy intelligence + competitor monitoring",
      "Approval workflows & team roles",
      "Priority support",
    ],
    cta: "Choose Growth",
    highlighted: true,
  },
  {
    name: "Pro",
    price: "$1,000",
    cadence: "/month",
    description: "For agencies and brands publishing daily across the web.",
    features: [
      "10 brand workspaces",
      "Unlimited AI-generated posts",
      "Full submind suite + learning engine",
      "Custom integrations & API access",
      "Dedicated success manager",
    ],
    cta: "Choose Pro",
    highlighted: false,
  },
  {
    name: "Enterprise",
    price: "Custom",
    cadence: "",
    description: "For organizations that need control, security, and scale.",
    features: [
      "Unlimited workspaces & seats",
      "SSO, SAML, audit logs",
      "Custom data residency",
      "On-prem submind tuning",
      "24/7 SLA-backed support",
    ],
    cta: "Talk to sales",
    highlighted: false,
  },
];

const LandingPricing = () => {
  const navigate = useNavigate();

  return (
    <section id="pricing" className="bg-white py-24 px-4 sm:px-6 border-t border-[#e2e5ea]/60">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16 max-w-3xl mx-auto">
          <p className="text-xs font-semibold tracking-widest uppercase text-[#a855f7] mb-3">Pricing</p>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-[#191a1f] mb-5">
            Plans that scale with your brand.
          </h2>
          <p className="text-base sm:text-lg text-[#6b7280] leading-relaxed">
            Start free with the waitlist. Pick the tier that matches the volume and complexity of your marketing — upgrade or downgrade anytime.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {TIERS.map((tier) => (
            <div
              key={tier.name}
              className={`relative flex flex-col rounded-2xl border p-7 ${
                tier.highlighted
                  ? "border-[#a855f7] shadow-[0_20px_60px_-20px_rgba(168,85,247,0.35)] bg-gradient-to-b from-white to-[#faf5ff]"
                  : "border-[#e2e5ea] bg-white"
              }`}
            >
              {tier.highlighted && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-[#6b5ce7] to-[#a855f7] text-white text-xs font-semibold px-3 py-1 rounded-full">
                  Most popular
                </div>
              )}
              <h3 className="text-xl font-semibold text-[#191a1f]">{tier.name}</h3>
              <div className="mt-3 flex items-baseline gap-1">
                <span className="text-4xl font-bold text-[#191a1f]">{tier.price}</span>
                {tier.cadence && <span className="text-sm text-[#6b7280]">{tier.cadence}</span>}
              </div>
              <p className="mt-3 text-sm text-[#6b7280] leading-relaxed min-h-[3rem]">
                {tier.description}
              </p>

              <ul className="mt-6 space-y-3 flex-1">
                {tier.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-[#374151]">
                    <Check className="h-4 w-4 text-[#2dd4a8] mt-0.5 flex-shrink-0" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>

              <Button
                onClick={() => navigate("/waitlist")}
                className={`mt-7 w-full ${
                  tier.highlighted
                    ? "bg-gradient-to-r from-[#6b5ce7] to-[#a855f7] text-white border-0 hover:opacity-90"
                    : "bg-[#191a1f] text-white hover:bg-[#374151]"
                }`}
              >
                {tier.cta}
              </Button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default LandingPricing;
