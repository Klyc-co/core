import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Zap, Users, MessageSquare, Target, BookOpen, ChevronDown, Rocket, Lock, Sparkles, Globe } from "lucide-react";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import StrategyScreen from "@/pages/StrategyScreen";

interface SectionProps {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

function CollapsibleSection({ title, icon, children, defaultOpen = false }: SectionProps) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <Card>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer py-3 px-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                {icon}
                {title}
              </CardTitle>
              <ChevronDown className={cn("w-4 h-4 text-muted-foreground transition-transform", open && "rotate-180")} />
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="pt-0">{children}</CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}

export default function StrategyDashboard() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("pipeline");
  const [betaUnlocked, setBetaUnlocked] = useState(false);
  const [betaPasscode, setBetaPasscode] = useState("");

  if (!betaUnlocked) {
    return (
      <div className="max-w-5xl mx-auto py-6 px-4 flex items-center justify-center min-h-[70vh]">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center text-center py-12 px-6 space-y-6">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
              <Lock className="w-8 h-8 text-primary" />
            </div>
            <div className="space-y-2">
              <h1 className="text-2xl font-bold text-foreground">Coming Soon</h1>
              <p className="text-muted-foreground">Strategy is currently in beta. Enter the beta passcode to continue.</p>
            </div>
            <div className="flex items-center gap-2 w-full max-w-xs">
              <Input
                type="password"
                placeholder="Enter passcode"
                value={betaPasscode}
                onChange={(e) => setBetaPasscode(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    if (betaPasscode === "373737") {
                      setBetaUnlocked(true);
                    } else {
                      setBetaPasscode("");
                      toast.error("Invalid passcode");
                    }
                  }
                }}
                className="text-center"
              />
              <Button
                onClick={() => {
                  if (betaPasscode === "373737") {
                    setBetaUnlocked(true);
                  } else {
                    setBetaPasscode("");
                    toast.error("Invalid passcode");
                  }
                }}
                className="gap-2"
              >
                <Sparkles className="w-4 h-4" />
                Enter
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">Beta testers only</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto py-6 px-4 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Zap className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">Strategy</h1>
            <p className="text-sm text-muted-foreground">Campaign pipeline, positioning, and strategic planning</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={() => navigate("/strategy/customer-analysis")}>
            <Globe className="w-4 h-4 mr-1.5" />
            Customer Analysis
          </Button>
          <Button size="sm" variant="outline" onClick={() => navigate("/brand-strategy")}>
            <MessageSquare className="w-4 h-4 mr-1.5" />
            Strategy Tools
          </Button>
          <Button size="sm" onClick={() => navigate("/campaigns")}>
            <Rocket className="w-4 h-4 mr-1.5" />
            Start Campaign
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="pipeline">Pipeline</TabsTrigger>
          <TabsTrigger value="positioning">Positioning</TabsTrigger>
          <TabsTrigger value="intelligence">Intelligence</TabsTrigger>
        </TabsList>

        <TabsContent value="pipeline" className="mt-4">
          <StrategyScreen />
        </TabsContent>

        <TabsContent value="positioning" className="mt-4 space-y-3">
          <CollapsibleSection title="Brand Voice & Persona" icon={<Users className="w-4 h-4 text-primary" />} defaultOpen>
            <p className="text-sm text-muted-foreground">
              Your brand persona and voice guidelines are configured in your profile settings.
              These inform how Klyc generates content across all campaigns.
            </p>
            <Button variant="outline" size="sm" className="mt-3" onClick={() => navigate("/profile/company")}>
              Edit Brand Voice
            </Button>
          </CollapsibleSection>

          <CollapsibleSection title="Campaign Strategy" icon={<Target className="w-4 h-4 text-primary" />}>
            <p className="text-sm text-muted-foreground">
              Strategic messaging pillars, content angles, and positioning frameworks generated by previous campaign runs.
            </p>
            <Button variant="outline" size="sm" className="mt-3" onClick={() => navigate("/brand-strategy")}>
              Open Strategy Tools
            </Button>
          </CollapsibleSection>

          <CollapsibleSection title="Competitive Positioning" icon={<MessageSquare className="w-4 h-4 text-primary" />}>
            <p className="text-sm text-muted-foreground">
              Competitor analysis, market positioning, and differentiation insights.
            </p>
            <Button variant="outline" size="sm" className="mt-3" onClick={() => navigate("/competitor-analysis")}>
              View Competitor Intel
            </Button>
          </CollapsibleSection>
        </TabsContent>

        <TabsContent value="intelligence" className="mt-4 space-y-3">
          <CollapsibleSection title="Market Intelligence" icon={<BookOpen className="w-4 h-4 text-primary" />} defaultOpen>
            <p className="text-sm text-muted-foreground">
              Trend monitoring, audience insights, and market signals collected by Klyc.
            </p>
            <Button variant="outline" size="sm" className="mt-3" onClick={() => navigate("/trend-monitor")}>
              View Trends
            </Button>
          </CollapsibleSection>

          <CollapsibleSection title="Learning Updates" icon={<Zap className="w-4 h-4 text-primary" />}>
            <p className="text-sm text-muted-foreground">
              Strategic recommendations from the Learning Engine based on campaign performance patterns.
            </p>
            <Button variant="outline" size="sm" className="mt-3" onClick={() => navigate("/learning")}>
              View Learning Hub
            </Button>
          </CollapsibleSection>
        </TabsContent>
      </Tabs>
    </div>
  );
}
