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
    color: "#2dd4a8",
    borderGradient: "linear-gradient(135deg, #2dd4a8, #3ab8c0)",
    bgTint: "rgba(45,212,168,0.08)",
    iconBg: "rgba(45,212,168,0.15)",
  },
  {
    id: "flyer" as const,
    title: "Flyer Generator",
    description: "Design branded social posts, flyers, and visual content using customizable templates with your brand colors and fonts.",
    icon: FileText,
    color: "#6b8de3",
    borderGradient: "linear-gradient(135deg, #5a9de0, #6b8de3)",
    bgTint: "rgba(107,141,227,0.08)",
    iconBg: "rgba(107,141,227,0.15)",
  },
  {
    id: "broll" as const,
    title: "B-Roll Generator",
    description: "Upload video clips and generate AI-powered B-roll footage to enhance your video content and campaigns.",
    icon: Film,
    color: "#a855f7",
    borderGradient: "linear-gradient(135deg, #8b6be3, #a855f7)",
    bgTint: "rgba(168,85,247,0.08)",
    iconBg: "rgba(168,85,247,0.15)",
  },
];

const CreativeHub = ({ onSelect }: CreativeHubProps) => {
  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8 text-center">
        <h2 className="text-2xl font-bold text-foreground">What would you like to create?</h2>
        <p className="text-muted-foreground mt-2">Choose a tool to get started</p>
      </div>

      <div className="grid gap-5 sm:grid-cols-3">
        {tools.map((tool) => {
          const Icon = tool.icon;
          return (
            <div
              key={tool.id}
              className="rounded-2xl p-[1px] hover:shadow-lg transition-shadow duration-200"
              style={{ background: tool.borderGradient }}
            >
              <button
                onClick={() => onSelect(tool.id)}
                className="group w-full flex flex-col items-center text-center p-8 rounded-[15px] bg-card hover:bg-card/80 transition-colors duration-200 h-full"
                style={{ background: `linear-gradient(to bottom, ${tool.bgTint}, hsl(var(--card)))` }}
              >
                <div
                  className="w-16 h-16 rounded-2xl flex items-center justify-center mb-5 group-hover:scale-110 transition-transform"
                  style={{ background: tool.iconBg }}
                >
                  <Icon className="w-8 h-8" style={{ color: tool.color }} />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">{tool.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{tool.description}</p>
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default CreativeHub;
