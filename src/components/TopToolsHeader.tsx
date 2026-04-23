import { useNavigate, useLocation } from "react-router-dom";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";
import {
  Home, Megaphone, Palette, BarChart3, Zap, FolderOpen, Lightbulb, Sun, Moon,
} from "lucide-react";

const toolItems = [
  { label: "Home", path: "/home", icon: Home },
  { label: "Posts", path: "/campaigns", icon: Megaphone },
  { label: "Creative", path: "/creative-studio", icon: Palette },
  { label: "Analytics", path: "/analytics", icon: BarChart3 },
  { label: "Strategy", path: "/strategy", icon: Zap },
  { label: "Library", path: "/profile/library", icon: FolderOpen },
  { label: "Learning", path: "/learning", icon: Lightbulb },
];

const TopToolsHeader = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { theme, setTheme } = useTheme();
  const isDark = theme === "dark";

  const isActive = (path: string) =>
    path === "/home" ? location.pathname === "/home" : location.pathname.startsWith(path);

  return (
    <header className="sticky top-0 z-30 h-11 bg-card/80 backdrop-blur-sm border-b border-border flex items-center justify-between px-3 shrink-0">
      <nav className="flex items-center gap-1 overflow-x-auto">
        {toolItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.path);
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={cn(
                "flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap",
                active
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              )}
            >
              <Icon className="w-3.5 h-3.5 shrink-0" />
              {item.label}
            </button>
          );
        })}
      </nav>
      <button
        onClick={() => setTheme(isDark ? "light" : "dark")}
        className="flex items-center justify-center w-8 h-8 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors shrink-0"
        aria-label="Toggle theme"
      >
        {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
      </button>
    </header>
  );
};

export default TopToolsHeader;
