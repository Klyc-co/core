import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { LogOut, Settings, User, MessageSquare } from "lucide-react";
import Logo from "@/components/Logo";
import type { User as SupabaseUser } from "@supabase/supabase-js";

interface AppHeaderProps {
  user: SupabaseUser | null;
  businessName?: string;
  unreadMessages?: number;
}

const AppHeader = ({ user, businessName, unreadMessages = 0 }: AppHeaderProps) => {
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
            variant="outline"
            onClick={() => navigate("/campaigns")}
            className="border-border/50 text-muted-foreground hover:text-foreground hover:border-border"
          >
            Campaigns
          </Button>
          <Button
            variant="outline"
            onClick={() => navigate("/projects")}
            className="border-border/50 text-muted-foreground hover:text-foreground hover:border-border"
          >
            Content
          </Button>
          <Button
            variant="outline"
            onClick={() => navigate("/brand-strategy")}
            className="border-border/50 text-muted-foreground hover:text-foreground hover:border-border"
          >
            Strategy
          </Button>
        </div>

        <div className="flex items-center gap-2">
          {businessName && (
            <span className="text-sm text-muted-foreground mr-2">{businessName}</span>
          )}
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => navigate("/messages")}
            className="relative"
          >
            <MessageSquare className="w-4 h-4" />
            {unreadMessages > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                {unreadMessages > 9 ? "9+" : unreadMessages}
              </span>
            )}
          </Button>
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
