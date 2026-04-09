import { cn } from "@/lib/utils";
import { Search, MessageSquare, FileEdit, Mail, BarChart3, Palette } from "lucide-react";

export type StrategyTool = 
  | "research" 
  | "messaging" 
  | "content" 
  | "email" 
  | "performance"
  | "brandcolors";

const tools: { id: StrategyTool; label: string; description: string; icon: typeof Search }[] = [
  { id: "research", label: "Research & Insights", description: "Reports, competitors, trends", icon: Search },
  { id: "messaging", label: "Strategy & Messaging", description: "Positioning, hooks, CTAs", icon: MessageSquare },
  { id: "content", label: "Platform Content", description: "Native posts by platform", icon: FileEdit },
  { id: "email", label: "Email Marketing", description: "Campaigns, sequences, optimization", icon: Mail },
  { id: "performance", label: "Social Performance", description: "Metrics & optimization", icon: BarChart3 },
  { id: "brandcolors", label: "Brand Colors", description: "Color palette & brand map", icon: Palette },
];

interface StrategyToolsSidebarProps {
  activeTool: StrategyTool;
  onToolChange: (tool: StrategyTool) => void;
}

export default function StrategyToolsSidebar({ activeTool, onToolChange }: StrategyToolsSidebarProps) {
  return (
    <div className="w-56 flex-shrink-0">
      <h2 className="text-sm font-semibold text-foreground mb-3">Strategy Tools</h2>
      <nav className="space-y-0.5">
        {tools.map((tool) => {
          const Icon = tool.icon;
          const isActive = activeTool === tool.id;
          return (
            <button
              key={tool.id}
              onClick={() => onToolChange(tool.id)}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-left",
                isActive
                  ? "bg-primary/10 text-primary border-l-2 border-primary"
                  : "hover:bg-muted text-foreground"
              )}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <div>
                <div className="text-sm font-medium">{tool.label}</div>
                <div className="text-xs text-muted-foreground">{tool.description}</div>
              </div>
            </button>
          );
        })}
      </nav>
    </div>
  );
}

export { tools };
