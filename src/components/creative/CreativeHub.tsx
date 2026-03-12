import { Image, FileText, Film } from "lucide-react";

interface CreativeHubProps {
  onSelect: (tool: "image-video" | "flyer" | "broll") => void;
}

const tools = [
  {
    id: "image-video" as const,
    title: "Image & Video Generator",
    description: "Create AI-generated images and videos from text prompts. Perfect for social media visuals, product shots, and marketing assets.",
    icon: Image,
  },
  {
    id: "flyer" as const,
    title: "Flyer Generator",
    description: "Design branded social posts, flyers, and visual content using customizable templates with your brand colors and fonts.",
    icon: FileText,
  },
  {
    id: "broll" as const,
    title: "B-Roll Generator",
    description: "Upload video clips and generate AI-powered B-roll footage to enhance your video content and campaigns.",
    icon: Film,
  },
];

const CreativeHub = ({ onSelect }: CreativeHubProps) => {
  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8 text-center">
        <h2 className="text-2xl font-bold text-foreground">What would you like to create?</h2>
        <p className="text-muted-foreground mt-2">Choose a tool to get started</p>
      </div>

      {/* Outer wrapper with the shared Klyc gradient flowing across all 3 cards */}
      <div
        className="rounded-2xl p-[1px] sm:grid sm:grid-cols-3"
        style={{
          background: "linear-gradient(to right, #2dd4a8, #6b8de3, #a855f7)",
        }}
      >
        {tools.map((tool, i) => {
          const Icon = tool.icon;
          const isFirst = i === 0;
          const isLast = i === tools.length - 1;
          const roundedClass = isFirst
            ? "rounded-t-2xl sm:rounded-l-2xl sm:rounded-tr-none"
            : isLast
              ? "rounded-b-2xl sm:rounded-r-2xl sm:rounded-bl-none"
              : "";

          return (
            <button
              key={tool.id}
              onClick={() => onSelect(tool.id)}
              className={`group relative flex flex-col items-center text-center p-8 bg-card/90 backdrop-blur-sm hover:bg-card/70 transition-all duration-200 ${roundedClass}`}
            >
              <div className="w-16 h-16 rounded-2xl bg-white/10 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform"
                style={{
                  background: `linear-gradient(135deg, ${
                    i === 0 ? "rgba(45,212,168,0.15)" : i === 1 ? "rgba(107,141,227,0.15)" : "rgba(168,85,247,0.15)"
                  }, transparent)`,
                }}
              >
                <Icon
                  className="w-8 h-8"
                  style={{
                    color: i === 0 ? "#2dd4a8" : i === 1 ? "#6b8de3" : "#a855f7",
                  }}
                />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">{tool.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{tool.description}</p>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default CreativeHub;
