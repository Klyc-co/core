import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Loader2, Menu, FileText } from "lucide-react";
import AppHeader from "@/components/AppHeader";
import StrategyMobileNav from "@/components/StrategyMobileNav";
import { useIsMobile } from "@/hooks/use-mobile";
import StrategyToolsSidebar, { type StrategyTool, tools } from "@/components/strategy/StrategyToolsSidebar";
import ResearchInsightsTool from "@/components/strategy/ResearchInsightsTool";
import StrategyMessagingTool from "@/components/strategy/StrategyMessagingTool";
import PlatformContentTool from "@/components/strategy/PlatformContentTool";
import EmailMarketingTool from "@/components/strategy/EmailMarketingTool";
import SocialPerformanceTool from "@/components/strategy/SocialPerformanceTool";
import type { User } from "@supabase/supabase-js";

const toolTitles: Record<StrategyTool, string> = {
  research: "Research & Insights",
  messaging: "Strategy & Messaging",
  content: "Platform Content",
  email: "Email Marketing",
  performance: "Social Performance",
};

const BrandStrategy = () => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTool, setActiveTool] = useState<StrategyTool>("research");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate("/auth"); return; }
      setUser(user);
      setLoading(false);
    };
    checkUser();
  }, [navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const renderTool = () => {
    switch (activeTool) {
      case "research": return <ResearchInsightsTool />;
      case "messaging": return <StrategyMessagingTool />;
      case "content": return <PlatformContentTool />;
      case "email": return <EmailMarketingTool />;
      case "performance": return <SocialPerformanceTool />;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <AppHeader user={user} />

      {isMobile && <StrategyMobileNav />}

      {/* Header */}
      <div className="border-b border-border bg-card/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            {isMobile && (
              <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
                <SheetTrigger asChild>
                  <Button variant="outline" size="icon" className="shrink-0"><Menu className="w-4 h-4" /></Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-[260px] p-4">
                  <h2 className="text-sm font-semibold text-foreground mb-3">Strategy Tools</h2>
                  <nav className="space-y-0.5">
                    {tools.map((tool) => {
                      const Icon = tool.icon;
                      const isActive = activeTool === tool.id;
                      return (
                        <button
                          key={tool.id}
                          onClick={() => { setActiveTool(tool.id); setMobileMenuOpen(false); }}
                          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-left ${isActive ? "bg-primary/10 text-primary" : "hover:bg-muted text-foreground"}`}
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
                </SheetContent>
              </Sheet>
            )}
            <h1 className="text-xl sm:text-2xl font-bold text-foreground">{toolTitles[activeTool]}</h1>
          </div>
          <Button variant="outline" size="sm" onClick={() => navigate("/brand-strategy/intelligence")} className="shrink-0">
            <FileText className="w-3.5 h-3.5 mr-1.5" />
            Strategy Intelligence
          </Button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
        <div className="flex gap-6">
          {!isMobile && (
            <StrategyToolsSidebar activeTool={activeTool} onToolChange={setActiveTool} />
          )}
          <div className="flex-1 min-w-0">
            {renderTool()}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BrandStrategy;
