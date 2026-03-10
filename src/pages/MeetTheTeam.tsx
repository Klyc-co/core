import { useNavigate } from "react-router-dom";
import { ArrowRight, ArrowLeft, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import LandingHeader from "@/components/landing/LandingHeader";

const specialists = [
  {
    name: "Atlas",
    title: "Research & Insights Agent",
    description:
      "Atlas uncovers the truth layer behind every campaign. He identifies audience behavior, trend momentum, competitor signals, and insight opportunities so the rest of the system starts from real data, not guesses.",
    items: ["Audience research", "Trend discovery", "Competitor analysis", "Insight packs"],
  },
  {
    name: "Fylix",
    title: "Platform Content Agent",
    description:
      "Fylix translates strategy into platform-native execution. He adapts messaging for the unique style, structure, and behavior of each channel so content feels native everywhere it appears.",
    items: ["LinkedIn content", "X content", "Instagram formatting", "TikTok / YouTube adaptation"],
  },
  {
    name: "Sloane",
    title: "Strategy & Messaging Agent",
    description:
      "Sloane turns insights into direction. She develops messaging pillars, hooks, CTAs, and content angles that align with awareness, lead generation, authority, and nurture goals.",
    items: ["Positioning", "Messaging pillars", "Hooks and CTAs", "Campaign direction"],
  },
  {
    name: "Iris",
    title: "Creative Media Agent",
    description:
      "Iris leads visual direction across the platform. She defines image concepts, carousel structures, creative styling, and repurposing logic so every campaign looks intentional and brand-right.",
    items: ["Visual direction", "Image concepts", "Carousel layouts", "Repurposing plans"],
  },
  {
    name: "Lyra",
    title: "Social Performance Agent",
    description:
      "Lyra monitors early engagement signals and identifies what is gaining traction. She helps Klyc understand when to iterate, boost, or double down based on real performance momentum.",
    items: ["Early velocity tracking", "Engagement signals", "Boost recommendations", "Optimization loops"],
  },
];

const MeetTheTeam = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <LandingHeader />

      {/* Page Header */}
      <section className="pt-28 pb-16 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight text-foreground mb-6">
            Meet the Team Behind Klyc
          </h1>
          <p className="text-lg sm:text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
            Klyc is powered by a team of specialist AI agents, each designed to handle a different part of the marketing workflow.
          </p>
        </div>
      </section>

      {/* Klyc — Orchestrator */}
      <section className="px-4 sm:px-6 pb-20">
        <div className="max-w-4xl mx-auto">
          <div className="rounded-3xl border border-border bg-card p-8 sm:p-12 shadow-sm flex flex-col md:flex-row gap-8 items-center">
            {/* Placeholder */}
            <div className="w-40 h-40 sm:w-48 sm:h-48 rounded-2xl bg-secondary flex-shrink-0 flex items-center justify-center">
              <User className="w-16 h-16 text-muted-foreground/40" />
            </div>
            <div>
              <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-1">Klyc</h2>
              <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-4">
                Campaign Orchestrator Agent
              </p>
              <p className="text-muted-foreground leading-relaxed">
                Runs the full system end to end — routing tasks, coordinating agents, validating outputs, and keeping campaigns moving.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Specialist Agents */}
      <section className="px-4 sm:px-6 pb-24">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold text-foreground text-center mb-14">
            The Specialist Team
          </h2>

          <div className="space-y-10">
            {specialists.map((agent, idx) => (
              <div
                key={agent.name}
                className={`rounded-3xl border border-border bg-card shadow-sm overflow-hidden flex flex-col ${
                  idx % 2 === 0 ? "md:flex-row" : "md:flex-row-reverse"
                } items-stretch`}
              >
                {/* Placeholder */}
                <div className="md:w-80 flex-shrink-0 bg-secondary flex items-center justify-center min-h-[240px]">
                  <User className="w-20 h-20 text-muted-foreground/30" />
                </div>

                {/* Content */}
                <div className="p-8 sm:p-10 flex flex-col justify-center flex-1">
                  <h3 className="text-2xl font-bold text-foreground mb-1">{agent.name}</h3>
                  <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-4">
                    {agent.title}
                  </p>
                  <p className="text-muted-foreground leading-relaxed mb-5">
                    {agent.description}
                  </p>
                  <ul className="grid grid-cols-2 gap-2">
                    {agent.items.map((item) => (
                      <li
                        key={item}
                        className="text-sm text-muted-foreground flex items-center gap-2"
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="py-20 px-4 sm:px-6 bg-secondary/50">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
            See How Klyc Works
          </h2>
          <p className="text-lg text-muted-foreground mb-8">
            Ready to let your marketing run itself? Explore how the system comes together.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              size="lg"
              onClick={() => navigate("/auth")}
              className="bg-gradient-to-r from-[hsl(260,60%,55%)] to-[hsl(280,60%,60%)] text-primary-foreground px-10 py-6 text-base rounded-xl font-medium hover:opacity-90 shadow-lg"
            >
              Get Started
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={() => navigate("/")}
              className="px-10 py-6 text-base rounded-xl"
            >
              <ArrowLeft className="mr-2 h-5 w-5" />
              Back to Home
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default MeetTheTeam;
