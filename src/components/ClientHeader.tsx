import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { LogOut, Settings, User, MessageSquare, Lightbulb } from "lucide-react";
import Logo from "@/components/Logo";
import type { User as SupabaseUser } from "@supabase/supabase-js";

interface ClientHeaderProps {
  user: SupabaseUser | null;
  unreadMessages?: number;
}

const ClientHeader = ({ user, unreadMessages = 0 }: ClientHeaderProps) => {
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  const isActive = (path: string) => location.pathname.startsWith(path);

  return (
    <header className="border-b border-border bg-card/50 backdrop-blur-xl sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Logo to="/client/dashboard" />
          <Button
            variant={isActive("/client/profile") ? "secondary" : "outline"}
            onClick={() => navigate("/client/profile")}
            className="border-border/50 text-muted-foreground hover:text-foreground hover:border-border"
          >
            Profile
          </Button>
          <Button
            variant={isActive("/client/campaigns") ? "secondary" : "outline"}
            onClick={() => navigate("/client/campaigns")}
            className="border-border/50 text-muted-foreground hover:text-foreground hover:border-border"
          >
            Campaigns
          </Button>
          <Button
            variant={isActive("/client/approvals") ? "secondary" : "outline"}
            onClick={() => navigate("/client/approvals")}
            className="border-border/50 text-muted-foreground hover:text-foreground hover:border-border"
          >
            Approvals
          </Button>
          <Button
            variant={isActive("/client/insights") ? "secondary" : "outline"}
            onClick={() => navigate("/client/insights")}
            className="border-border/50 text-muted-foreground hover:text-foreground hover:border-border"
          >
            Insights
          </Button>
          <Button
            variant={isActive("/client/strategy") ? "secondary" : "outline"}
            onClick={() => navigate("/client/strategy")}
            className="border-border/50 text-muted-foreground hover:text-foreground hover:border-border"
          >
            Strategy
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => navigate("/client/messages")}
            className="relative"
          >
            <MessageSquare className="w-4 h-4" />
            {unreadMessages > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                {unreadMessages > 9 ? "9+" : unreadMessages}
              </span>
            )}
          </Button>
          <Button variant="ghost" size="icon" onClick={() => navigate("/client/profile")}>
            <User className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => navigate("/client/settings")}>
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

export default ClientHeader;
