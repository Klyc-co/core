import { Image, FileText, Film, UserCheck } from "lucide-react";

interface CreativeHubProps {
  onSelect: (tool: "image-video" | "flyer" | "broll" | "hire") => void;
}

const tools = [
  {
    id: "image-video" as const,
    title: "Image & Video Generator",
    description: "Create AI-generated images and videos from text prompts. Perfect for social media visuals, product shots, and marketing assets.",
    icon: Image,
    color: "#2dd4a8",
    iconBg: "rgba(45,212,168,0.10)",
  },
  {
    id: "flyer" as const,
    title: "Templates",
    description: "Design branded social posts, flyers, and visual content using customizable templates with your brand colors and fonts.",
    icon: FileText,
    color: "#6b8de3",
    iconBg: "rgba(107,141,227,0.10)",
  },
  {
    id: "broll" as const,
    title: "B-Roll Generator",
    description: "Upload video clips and generate AI-powered B-roll footage to enhance your video content and campaigns.",
    icon: Film,
    color: "#a855f7",
    iconBg: "rgba(168,85,247,0.10)",
  },
  {
    id: "hire" as const,
    title: "Hire a Professional",
    description: "Hire a KLYC team member to create any kind of video ad for you. Get custom, high-quality creatives tailored to your brand.",
    icon: UserCheck,
    color: "#f59e0b",
    iconBg: "rgba(245,158,11,0.10)",
  },
];

const CreativeHub = ({ onSelect }: CreativeHubProps) => {
  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8 text-center">
        <h2 className="text-2xl font-bold text-foreground">What would you like to create?</h2>
        <p className="text-muted-foreground mt-2">Choose a tool to get started</p>
      </div>

      <div className="grid grid-cols-2 gap-6 max-w-2xl mx-auto">
        {tools.map((tool) => {
          const Icon = tool.icon;
          return (
            <button
              key={tool.id}
              onClick={() => onSelect(tool.id)}
              className="group flex flex-col items-center justify-center text-center p-8 rounded-2xl border border-border bg-card hover:border-border/80 hover:shadow-md transition-all duration-200 min-h-[140px]"
            >
              <div
                className="w-16 h-16 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform"
                style={{ background: tool.iconBg }}
              >
                <Icon className="w-8 h-8" style={{ color: tool.color }} />
              </div>
              <h3 className="text-base font-semibold text-foreground">{tool.title}</h3>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default CreativeHub;
