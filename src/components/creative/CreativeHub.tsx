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
    gradient: "from-primary/20 to-primary/5",
    iconBg: "bg-primary/15",
    iconColor: "text-primary",
  },
  {
    id: "flyer" as const,
    title: "Flyer Generator",
    description: "Design branded social posts, flyers, and visual content using customizable templates with your brand colors and fonts.",
    icon: FileText,
    gradient: "from-accent/20 to-accent/5",
    iconBg: "bg-accent/15",
    iconColor: "text-accent-foreground",
  },
  {
    id: "broll" as const,
    title: "B-Roll Generator",
    description: "Upload video clips and generate AI-powered B-roll footage to enhance your video content and campaigns.",
    icon: Film,
    gradient: "from-secondary/30 to-secondary/10",
    iconBg: "bg-secondary",
    iconColor: "text-secondary-foreground",
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
            <button
              key={tool.id}
              onClick={() => onSelect(tool.id)}
              className={`group relative flex flex-col items-center text-center p-8 rounded-2xl border border-border bg-gradient-to-br ${tool.gradient} hover:border-primary/40 hover:shadow-lg transition-all duration-200`}
            >
              <div className={`w-16 h-16 rounded-2xl ${tool.iconBg} flex items-center justify-center mb-5 group-hover:scale-110 transition-transform`}>
                <Icon className={`w-8 h-8 ${tool.iconColor}`} />
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
