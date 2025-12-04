import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { LogOut, Settings, User } from "lucide-react";
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
            Campaigns
          </Button>
          <Button
            variant="ghost"
            onClick={() => navigate("/projects")}
            className="text-muted-foreground hover:text-foreground"
          >
            Content Generation
          </Button>
          <Button
            variant="ghost"
            onClick={() => navigate("/brand-strategy")}
            className="text-muted-foreground hover:text-foreground"
          >
            Brand Strategy
          </Button>
        </div>

        <div className="flex items-center gap-2">
          {businessName && (
            <span className="text-sm text-muted-foreground mr-2">{businessName}</span>
          )}
          <Button variant="ghost" size="icon" onClick={() => navigate("/profile")}>
            <User className="w-4 h-4" />
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
