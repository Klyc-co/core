import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import klycLogo from "@/assets/klyc-logo-transparent.png";

const teamMembers = [
  {
    name: "Placeholder Name",
    title: "Visionary",
    subtitle: "Co-Founder",
    bio: "Driving the future of AI-powered marketing with a bold vision for what's possible.",
    gradient: "from-[#6b5ce7] to-[#a855f7]",
  },
  {
    name: "Placeholder Name",
    title: "CEO",
    subtitle: "Co-Founder",
    bio: "Leading strategy and operations to bring Klyc to market and scale globally.",
    gradient: "from-[#3b82f6] to-[#06b6d4]",
  },
  {
    name: "Placeholder Name",
    title: "CTO",
    subtitle: "Co-Founder",
    bio: "Architecting the technology stack that powers every Klyc campaign pipeline.",
    gradient: "from-[#10b981] to-[#34d399]",
  },
  {
    name: "Placeholder Name",
    title: "AI Dev",
    subtitle: "",
    bio: "Building the submind intelligence layer that makes Klyc's AI marketing engine tick.",
    gradient: "from-[#f59e0b] to-[#f97316]",
  },
];

const Team = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-border/40 bg-white/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto flex items-center justify-between px-4 sm:px-6 py-3">
          <img
            src={klycLogo}
            alt="Klyc"
            className="h-12 sm:h-14 cursor-pointer"
            onClick={() => navigate("/")}
          />
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors text-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to home
          </button>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-16 sm:py-24">
        <div className="text-center mb-16">
          <h1 className="text-4xl sm:text-5xl font-bold text-foreground mb-4">
            Meet the Team
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            The people building the future of autonomous marketing.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
          {teamMembers.map((member) => (
            <div
              key={member.title}
              className="rounded-2xl border border-border/60 bg-white p-8 flex flex-col items-center text-center shadow-sm hover:shadow-md transition-shadow"
            >
              {/* Avatar placeholder */}
              <div
                className={`w-24 h-24 rounded-full bg-gradient-to-br ${member.gradient} flex items-center justify-center text-white text-3xl font-bold mb-5`}
              >
                {member.name
                  .split(" ")
                  .map((n) => n[0])
                  .join("")}
              </div>

              <h2 className="text-xl font-semibold text-foreground">
                {member.name}
              </h2>
              <p
                className={`text-sm font-medium bg-gradient-to-r ${member.gradient} bg-clip-text text-transparent mt-1`}
              >
                {member.title}
                {member.subtitle ? ` · ${member.subtitle}` : ""}
              </p>
              <p className="text-muted-foreground text-sm mt-3 leading-relaxed">
                {member.bio}
              </p>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
};

export default Team;
