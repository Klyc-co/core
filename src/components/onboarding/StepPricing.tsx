import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ArrowRight, Check, Sparkles, Zap, Crown } from "lucide-react";
import { cn } from "@/lib/utils";

interface StepPricingProps {
  onNext: (plan: string) => void;
}

const plans = [
  {
    id: "free",
    name: "Free",
    price: "$0",
    period: "/month",
    description: "Get started and explore Klyc's capabilities.",
    icon: Zap,
    features: ["3 posts per week", "1 social platform", "Basic brand profile", "Community support"],
    popular: false,
  },
  {
    id: "starter",
    name: "Starter",
    price: "$29",
    period: "/month",
    description: "For growing brands ready to scale content.",
    icon: Sparkles,
    features: ["Unlimited posts", "3 social platforms", "Full brand library", "Visual style presets", "Priority support"],
    popular: true,
  },
  {
    id: "pro",
    name: "Pro",
    price: "$79",
    period: "/month",
    description: "For teams and agencies managing multiple brands.",
    icon: Crown,
    features: ["Everything in Starter", "All platforms", "Advanced analytics", "Team collaboration", "API access", "Dedicated support"],
    popular: false,
  },
];

const StepPricing = ({ onNext }: StepPricingProps) => {
  const [selected, setSelected] = useState<string>("starter");

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-4xl animate-fade-in">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold text-foreground mb-3">Choose your plan.</h1>
          <p className="text-muted-foreground">Pick the setup that fits your business best.</p>
        </div>

        <div className="grid gap-5 sm:grid-cols-3 mb-8">
          {plans.map((plan) => (
            <button
              key={plan.id}
              onClick={() => setSelected(plan.id)}
              className={cn(
                "relative flex flex-col p-6 rounded-2xl border-2 transition-all duration-200 text-left",
                selected === plan.id
                  ? "border-primary bg-primary/5 shadow-lg"
                  : "border-border bg-card hover:border-primary/40",
                plan.popular && "ring-1 ring-primary/20"
              )}
            >
              {plan.popular && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-xs font-semibold px-3 py-1 rounded-full text-primary-foreground"
                  style={{ background: "linear-gradient(135deg, hsl(185 75% 45%), hsl(250 60% 60%))" }}>
                  Most Popular
                </span>
              )}

              <div className={cn(
                "w-10 h-10 rounded-xl flex items-center justify-center mb-4",
                selected === plan.id ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
              )}>
                <plan.icon className="w-5 h-5" />
              </div>

              <h3 className="text-lg font-bold text-foreground">{plan.name}</h3>
              <div className="flex items-baseline gap-1 mt-1 mb-2">
                <span className="text-3xl font-bold text-foreground">{plan.price}</span>
                <span className="text-sm text-muted-foreground">{plan.period}</span>
              </div>
              <p className="text-xs text-muted-foreground mb-4">{plan.description}</p>

              <ul className="space-y-2 mt-auto">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-xs text-foreground">
                    <Check className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
            </button>
          ))}
        </div>

        <div className="flex flex-col items-center gap-3">
          <Button
            onClick={() => onNext(selected)}
            size="lg"
            className="h-12 px-10 text-base font-semibold"
          >
            Continue
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
          <button className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            Need enterprise? Contact sales →
          </button>
        </div>
      </div>
    </div>
  );
};

export default StepPricing;
