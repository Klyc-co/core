import { useNavigate, useLocation } from "react-router-dom";
import { BarChart3, Users, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

const modules = [
  { 
    path: "/brand-strategy", 
    label: "Report", 
    fullLabel: "Run Report",
    icon: BarChart3 
  },
  { 
    path: "/competitor-analysis", 
    label: "Competitors", 
    fullLabel: "Competitor Analysis",
    icon: Users 
  },
  { 
    path: "/trend-monitor", 
    label: "Trends", 
    fullLabel: "Trend Monitor",
    icon: TrendingUp 
  },
];

interface StrategyMobileNavProps {
  className?: string;
}

export default function StrategyMobileNav({ className }: StrategyMobileNavProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const currentPath = location.pathname;

  return (
    <div className={cn("bg-card border-b border-border sticky top-0 z-40", className)}>
      <div className="px-3 py-2">
        <p className="text-xs text-muted-foreground font-medium mb-2">Strategy</p>
        <div className="flex gap-1">
          {modules.map((module) => {
            const isActive = currentPath === module.path;
            const Icon = module.icon;
            
            return (
              <button
                key={module.path}
                onClick={() => navigate(module.path)}
                className={cn(
                  "flex-1 flex items-center justify-center gap-1.5 px-2 py-2 rounded-lg text-xs font-medium transition-colors",
                  isActive 
                    ? "bg-primary text-primary-foreground" 
                    : "bg-muted/50 text-muted-foreground hover:bg-muted"
                )}
              >
                <Icon className="w-3.5 h-3.5" />
                <span className="truncate">{module.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
