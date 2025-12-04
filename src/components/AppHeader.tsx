import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { LogOut, Sparkles, Settings, User, Megaphone, Target } from "lucide-react";
import Logo from "@/components/Logo";
import type { User as SupabaseUser } from "@supabase/supabase-js";

interface AppHeaderProps {
  user: SupabaseUser | null;
  businessName?: string;
}

const AppHeader = ({ user, businessName }: AppHeaderProps) => {
  const navigate = useNavigate();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  return (
    <header className="border-b border-border bg-card/50 backdrop-blur-xl sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Logo />
          <Button
            variant="ghost"
            onClick={() => navigate("/campaigns")}
            className="text-muted-foreground hover:text-foreground"
          >
            <Megaphone className="w-4 h-4 mr-2" />
            Campaigns
          </Button>
          <Button
            variant="ghost"
            onClick={() => navigate("/projects")}
            className="text-muted-foreground hover:text-foreground"
          >
            <Sparkles className="w-4 h-4 mr-2" />
            Content Generation
          </Button>
          <Button
            variant="ghost"
            onClick={() => navigate("/brand-strategy")}
            className="text-muted-foreground hover:text-foreground"
          >
            <Target className="w-4 h-4 mr-2" />
            Brand Strategy
          </Button>
        </div>

        <div className="flex items-center gap-4">
          {businessName && (
            <span className="text-sm text-muted-foreground">{businessName}</span>
          )}
          <Button
            variant="ghost"
            onClick={() => navigate("/profile")}
            className="text-muted-foreground hover:text-foreground"
          >
            <User className="w-4 h-4 mr-2" />
            Profile
          </Button>
          <Button variant="ghost" size="icon" onClick={() => navigate("/settings")}>
            <Settings className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={handleLogout}>
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </header>
  );
};

export default AppHeader;
