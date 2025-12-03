import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { LogOut, Sparkles } from "lucide-react";
import Logo from "@/components/Logo";
import type { User } from "@supabase/supabase-js";

interface AppHeaderProps {
  user: User | null;
}

const AppHeader = ({ user }: AppHeaderProps) => {
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
            onClick={() => navigate("/projects")}
            className="text-muted-foreground hover:text-foreground"
          >
            <Sparkles className="w-4 h-4 mr-2" />
            Content Generation
          </Button>
        </div>

        <div className="flex items-center gap-4">
          <span className="text-sm text-muted-foreground">{user?.email}</span>
          <Button variant="ghost" size="icon" onClick={handleLogout}>
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </header>
  );
};

export default AppHeader;
