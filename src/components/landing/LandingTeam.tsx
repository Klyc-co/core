import { useNavigate } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import atlasImg from "@/assets/team/atlas.png";
import fylixImg from "@/assets/team/fylix.png";
import sloaneImg from "@/assets/team/sloane.png";
import irisImg from "@/assets/team/iris.png";
import lyraImg from "@/assets/team/lyra.png";

const agents = [
  {
    name: "Atlas",
    title: "Research & Insights Agent",
    description: "Finds trends, audience insights, and competitor intelligence.",
    image: atlasImg,
  },
  {
    name: "Iris",
    title: "Creative Media Agent",
    description: "Leads visual concepts, creative direction, and repurposing.",
    image: irisImg,
  },
  {
    name: "Sloane",
    title: "Strategy & Messaging Agent",
    description: "Shapes positioning, hooks, CTAs, and campaign direction.",
    image: sloaneImg,
  },
  {
    name: "Fylix",
    title: "Platform Content Agent",
    description: "Creates platform-native content for every channel.",
    image: fylixImg,
  },
  {
    name: "Lyra",
    title: "Social Performance Agent",
    description: "Tracks momentum, engagement signals, and optimization opportunities.",
    image: lyraImg,
  },
];

const LandingTeam = () => {
  const navigate = useNavigate();

  return (
    <section className="py-24 sm:py-32 px-4 sm:px-6 bg-background">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-foreground mb-4">
            Team Behind Klyc
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Meet the specialist agents that power Klyc behind the scenes.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6 mb-12">
          {agents.map((agent) => (
            <div
              key={agent.name}
              className="group rounded-2xl border border-border bg-card p-6 shadow-sm hover:shadow-lg hover:border-primary/30 transition-all duration-300"
            >
              {/* Headshot — cropped to upper portion */}
              <div className="w-full aspect-square rounded-xl bg-secondary overflow-hidden mb-5">
                <img
                  src={agent.image}
                  alt={agent.name}
                  className="w-full h-full object-cover object-top scale-125 translate-y-[-5%]"
                />
              </div>

              <h3 className="text-lg font-semibold text-foreground mb-1">
                {agent.name}
              </h3>
              <p className="text-xs font-medium text-primary mb-2 uppercase tracking-wider">
                {agent.title}
              </p>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {agent.description}
              </p>
            </div>
          ))}
        </div>

        <div className="text-center">
          <Button
            size="lg"
            onClick={() => navigate("/meet-the-team")}
            className="bg-gradient-to-r from-[hsl(260,60%,55%)] to-[hsl(280,60%,60%)] text-primary-foreground px-10 py-6 text-base rounded-xl font-medium hover:opacity-90 shadow-lg"
          >
            Meet the Team
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </div>
      </div>
    </section>
  );
};

export default LandingTeam;
