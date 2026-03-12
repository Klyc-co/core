import { useNavigate, useLocation } from "react-router-dom";
import { Search, MessageSquare, FileEdit, Mail, BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils";

const modules = [
  { path: "/brand-strategy", label: "Research", icon: Search },
  { path: "/brand-strategy", label: "Strategy", icon: MessageSquare },
  { path: "/brand-strategy", label: "Content", icon: FileEdit },
  { path: "/brand-strategy", label: "Email", icon: Mail },
  { path: "/brand-strategy", label: "Perform", icon: BarChart3 },
];

interface StrategyMobileNavProps {
  className?: string;
}

export default function StrategyMobileNav({ className }: StrategyMobileNavProps) {
  const location = useLocation();
  const isStrategy = location.pathname === "/brand-strategy";

  if (!isStrategy) return null;

  return (
    <div className={cn("bg-card border-b border-border sticky top-0 z-40", className)}>
      <div className="px-3 py-2">
        <p className="text-xs text-muted-foreground font-medium mb-2">Strategy Tools</p>
      </div>
    </div>
  );
}
