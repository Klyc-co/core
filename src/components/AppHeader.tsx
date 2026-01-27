import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { LogOut, Settings, User, MessageSquare, Menu, X } from "lucide-react";
import Logo from "@/components/Logo";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/use-mobile";
import type { User as SupabaseUser } from "@supabase/supabase-js";

interface AppHeaderProps {
  user: SupabaseUser | null;
  businessName?: string;
  unreadMessages?: number;
}

const AppHeader = ({ user, businessName, unreadMessages = 0 }: AppHeaderProps) => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  const navItems = [
    { label: "Campaigns", path: "/campaigns" },
    { label: "Content", path: "/projects" },
    { label: "Strategy", path: "/brand-strategy" },
  ];

  const NavButtons = ({ mobile = false }: { mobile?: boolean }) => (
    <div className={mobile ? "flex flex-col gap-2" : "flex items-center gap-2"}>
      {navItems.map((item) => (
        <Button
          key={item.path}
          variant="ghost"
          onClick={() => {
            navigate(item.path);
            if (mobile) setMobileMenuOpen(false);
          }}
          className={`justify-start ${mobile ? "w-full text-left h-12 text-base" : "border border-border/50 text-muted-foreground hover:text-foreground hover:border-border"}`}
        >
          {item.label}
        </Button>
      ))}
    </div>
  );

  const ActionButtons = ({ mobile = false }: { mobile?: boolean }) => (
    <div className={mobile ? "flex flex-col gap-2 pt-4 border-t border-border" : "flex items-center gap-1"}>
      {businessName && !mobile && (
        <span className="text-sm text-muted-foreground mr-2 hidden lg:block">{businessName}</span>
      )}
      <Button 
        variant="ghost" 
        size={mobile ? "default" : "icon"}
        onClick={() => {
          navigate("/messages");
          if (mobile) setMobileMenuOpen(false);
        }}
        className={`relative ${mobile ? "justify-start w-full h-12" : ""}`}
      >
        <MessageSquare className="w-4 h-4" />
        {mobile && <span className="ml-2">Messages</span>}
        {unreadMessages > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-destructive text-destructive-foreground text-xs rounded-full flex items-center justify-center">
            {unreadMessages > 9 ? "9+" : unreadMessages}
          </span>
        )}
      </Button>
      <Button 
        variant="ghost" 
        size={mobile ? "default" : "icon"}
        onClick={() => {
          navigate("/profile");
          if (mobile) setMobileMenuOpen(false);
        }}
        className={mobile ? "justify-start w-full h-12" : ""}
      >
        <User className="w-4 h-4" />
        {mobile && <span className="ml-2">Profile</span>}
      </Button>
      <Button 
        variant="ghost" 
        size={mobile ? "default" : "icon"}
        onClick={() => {
          navigate("/settings");
          if (mobile) setMobileMenuOpen(false);
        }}
        className={mobile ? "justify-start w-full h-12" : ""}
      >
        <Settings className="w-4 h-4" />
        {mobile && <span className="ml-2">Settings</span>}
      </Button>
      <Button 
        variant="ghost" 
        size={mobile ? "default" : "icon"}
        onClick={() => {
          handleLogout();
          if (mobile) setMobileMenuOpen(false);
        }}
        className={mobile ? "justify-start w-full h-12 text-destructive hover:text-destructive" : ""}
      >
        <LogOut className="w-4 h-4" />
        {mobile && <span className="ml-2">Logout</span>}
      </Button>
    </div>
  );

  return (
    <header className="border-b border-border bg-card/50 backdrop-blur-xl sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-4 md:gap-6">
          <Logo />
          {!isMobile && <NavButtons />}
        </div>

        {isMobile ? (
          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="w-5 h-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-72 p-6">
              <div className="flex flex-col h-full">
                <div className="flex items-center justify-between mb-6">
                  <Logo />
                </div>
                {businessName && (
                  <p className="text-sm text-muted-foreground mb-4 pb-4 border-b border-border">
                    Working on: <span className="font-medium text-foreground">{businessName}</span>
                  </p>
                )}
                <NavButtons mobile />
                <div className="flex-1" />
                <ActionButtons mobile />
              </div>
            </SheetContent>
          </Sheet>
        ) : (
          <ActionButtons />
        )}
      </div>
    </header>
  );
};

export default AppHeader;
