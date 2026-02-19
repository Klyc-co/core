import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { 
  Users, 
  Target,
  Lightbulb,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Loader2,
  Search,
  BarChart3,
  Globe,
  Trash2,
  ArrowLeft,
  Menu
} from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import AppHeader from "@/components/AppHeader";
import StrategyMobileNav from "@/components/StrategyMobileNav";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { User } from "@supabase/supabase-js";

interface CompetitorAnalysis {
  id: string;
  competitor_name: string;
  competitor_url: string | null;
  analyzed_at: string;
  company_description: string | null;
  target_audience: string | null;
  value_proposition: string | null;
  key_products: string | null;
  pricing_strategy: string | null;
  marketing_channels: string | null;
  strengths: string | null;
  weaknesses: string | null;
  opportunities: string | null;
  threats: string | null;
}

const CompetitorAnalysisPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  
  const [user, setUser] = useState<User | null>(null);
  const [competitorName, setCompetitorName] = useState("");
  const [competitorUrl, setCompetitorUrl] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analyses, setAnalyses] = useState<CompetitorAnalysis[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAnalysis, setSelectedAnalysis] = useState<CompetitorAnalysis | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }
      setUser(user);
      fetchAnalyses(user.id);
    };
    checkUser();
  }, [navigate]);

  const fetchAnalyses = async (userId: string) => {
    setLoading(true);
    const { data, error } = await supabase
      .from('competitor_analyses')
      .select('*')
      .eq('user_id', userId)
      .order('analyzed_at', { ascending: false });
    
    if (!error && data) {
      setAnalyses(data as CompetitorAnalysis[]);
      if (data.length > 0 && !selectedAnalysis) {
        setSelectedAnalysis(data[0] as CompetitorAnalysis);
      }
    }
    setLoading(false);
  };

  const handleAnalyze = async () => {
    if (!competitorName || !user) {
      toast({ title: "Missing competitor name", variant: "destructive" });
      return;
    }

    setIsAnalyzing(true);

    try {
      const { data, error } = await supabase.functions.invoke('analyze-competitor', {
        body: { 
          competitorName, 
          competitorUrl: competitorUrl || null,
          userId: user.id 
        }
      });

      if (error) throw error;

      toast({ 
        title: "Analysis complete!", 
        description: `Analyzed ${competitorName} using ${data.sourcesCount} sources` 
      });
      
      setCompetitorName("");
      setCompetitorUrl("");
      fetchAnalyses(user.id);
      
      if (data.analysis) {
        setSelectedAnalysis(data.analysis);
      }
    } catch (error: any) {
      console.error('Analysis error:', error);
      toast({ 
        title: "Analysis failed", 
        description: error.message || "Please try again",
        variant: "destructive" 
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase
      .from('competitor_analyses')
      .delete()
      .eq('id', id);

    if (error) {
      toast({ title: "Error", description: "Failed to delete analysis", variant: "destructive" });
    } else {
      setAnalyses(analyses.filter(a => a.id !== id));
      if (selectedAnalysis?.id === id) {
        setSelectedAnalysis(analyses.find(a => a.id !== id) || null);
      }
      toast({ title: "Deleted", description: "Analysis removed" });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Sidebar content for mobile sheet
  const SidebarContent = () => (
    <>
      <h2 className="text-sm font-semibold text-foreground mb-4">Strategy Modules</h2>
      <nav className="space-y-1">
        <button 
          onClick={() => {
            setMobileMenuOpen(false);
            navigate("/brand-strategy");
          }}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-muted text-foreground"
        >
          <BarChart3 className="w-4 h-4" />
          <div className="text-left">
            <div className="text-sm font-medium">Run Report</div>
            <div className="text-xs text-muted-foreground">Schedule web reports</div>
          </div>
        </button>
        <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg bg-primary/10 text-primary border-l-2 border-primary">
          <Users className="w-4 h-4" />
          <div className="text-left">
            <div className="text-sm font-medium">Competitor Analysis</div>
            <div className="text-xs text-muted-foreground">Analyze competitors</div>
          </div>
        </button>
        <button 
          onClick={() => {
            setMobileMenuOpen(false);
            navigate("/trend-monitor");
          }}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-muted text-foreground"
        >
          <TrendingUp className="w-4 h-4" />
          <div className="text-left">
            <div className="text-sm font-medium">Trend Monitor</div>
            <div className="text-xs text-muted-foreground">Track social trends</div>
          </div>
        </button>
      </nav>

      {/* Previous Analyses */}
      {analyses.length > 0 && (
        <div className="mt-8">
          <h3 className="text-sm font-semibold text-foreground mb-3">Recent Analyses</h3>
          <ScrollArea className="h-[250px]">
            <div className="space-y-2 pr-2">
              {analyses.map((analysis) => (
                <div 
                  key={analysis.id}
                  onClick={() => {
                    setSelectedAnalysis(analysis);
                    if (isMobile) setMobileMenuOpen(false);
                  }}
                  className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                    selectedAnalysis?.id === analysis.id 
                      ? 'bg-primary/10 border-primary' 
                      : 'bg-card hover:bg-muted'
                  }`}
                >
                  <p className="font-medium text-sm truncate">{analysis.competitor_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(analysis.analyzed_at), "MMM d, yyyy")}
                  </p>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>
      )}
    </>
  );

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      <AppHeader user={user} />
      
      {/* Mobile Strategy Navigation */}
      {isMobile && <StrategyMobileNav />}
      
      {/* Page Header */}
      <div className="border-b border-border bg-card/50">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 py-3 sm:py-4">
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Mobile sidebar toggle */}
            {isMobile && (
              <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
                <SheetTrigger asChild>
                  <Button variant="outline" size="icon" className="shrink-0">
                    <Menu className="w-5 h-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-[85vw] max-w-[320px] overflow-y-auto">
                  <SheetHeader>
                    <SheetTitle className="flex items-center gap-2">
                      <Users className="w-5 h-5 text-primary" />
                      Competitor Analysis
                    </SheetTitle>
                  </SheetHeader>
                  <div className="mt-4">
                    <SidebarContent />
                  </div>
                </SheetContent>
              </Sheet>
            )}
            
            {!isMobile && (
              <Button variant="ghost" size="icon" onClick={() => navigate('/brand-strategy')}>
                <ArrowLeft className="w-5 h-5" />
              </Button>
            )}
            <div className="min-w-0">
              <h1 className="text-lg sm:text-2xl font-bold text-foreground truncate">Competitor Analysis</h1>
              <p className="text-muted-foreground text-xs sm:text-sm hidden sm:block">
                AI-powered competitive intelligence and market positioning analysis.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-3 sm:px-6 py-4 sm:py-8">
        <div className="flex flex-col lg:flex-row gap-4 sm:gap-8">
          {/* Desktop Left Sidebar */}
          {!isMobile && (
            <div className="w-64 flex-shrink-0">
              <SidebarContent />
            </div>
          )}

          {/* Main Content */}
          <div className="flex-1 min-w-0 space-y-6">
            {/* Input Card */}
            <Card>
              <CardContent className="pt-4 sm:pt-6">
                <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4 flex items-center gap-2">
                  <Search className="w-4 h-4 sm:w-5 sm:h-5" />
                  Analyze a Competitor
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-4">
                  <div>
                    <label className="text-xs sm:text-sm font-medium mb-1.5 sm:mb-2 block">
                      Competitor Name *
                    </label>
                    <Input
                      placeholder="e.g., Notion, Slack"
                      value={competitorName}
                      onChange={(e) => setCompetitorName(e.target.value)}
                      className="text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs sm:text-sm font-medium mb-1.5 sm:mb-2 block flex items-center gap-1">
                      <Globe className="w-3 h-3" />
                      Website URL (optional)
                    </label>
                    <Input
                      placeholder="https://competitor.com"
                      value={competitorUrl}
                      onChange={(e) => setCompetitorUrl(e.target.value)}
                      className="text-sm"
                    />
                  </div>
                </div>
                <Button 
                  onClick={handleAnalyze} 
                  disabled={isAnalyzing || !competitorName}
                  className="w-full"
                  size={isMobile ? "sm" : "default"}
                >
                  {isAnalyzing ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <Search className="w-4 h-4 mr-2" />
                      Analyze Competitor
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* Results */}
            {selectedAnalysis ? (
              <div className="space-y-3 sm:space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="min-w-0">
                    <h2 className="text-lg sm:text-2xl font-bold truncate">{selectedAnalysis.competitor_name}</h2>
                    {selectedAnalysis.competitor_url && (
                      <a 
                        href={selectedAnalysis.competitor_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs sm:text-sm text-primary hover:underline truncate block"
                      >
                        {selectedAnalysis.competitor_url}
                      </a>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant="outline" className="text-xs">
                      {format(new Date(selectedAnalysis.analyzed_at), "MMM d, yyyy")}
                    </Badge>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => handleDelete(selectedAnalysis.id)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                {/* Overview */}
                <Card>
                  <CardHeader className="pb-2 sm:pb-4">
                    <CardTitle className="text-sm sm:text-base">Company Overview</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-xs sm:text-sm text-muted-foreground">{selectedAnalysis.company_description}</p>
                  </CardContent>
                </Card>

                {/* Key Info Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <Card>
                    <CardHeader className="pb-1 sm:pb-2">
                      <CardTitle className="text-xs sm:text-sm flex items-center gap-2">
                        <Target className="w-3 h-3 sm:w-4 sm:h-4 text-primary" />
                        Target Audience
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <p className="text-xs sm:text-sm text-muted-foreground">{selectedAnalysis.target_audience}</p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-1 sm:pb-2">
                      <CardTitle className="text-xs sm:text-sm flex items-center gap-2">
                        <Lightbulb className="w-3 h-3 sm:w-4 sm:h-4 text-yellow-500" />
                        Value Proposition
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <p className="text-xs sm:text-sm text-muted-foreground">{selectedAnalysis.value_proposition}</p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-1 sm:pb-2">
                      <CardTitle className="text-xs sm:text-sm">Key Products</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <p className="text-xs sm:text-sm text-muted-foreground">{selectedAnalysis.key_products}</p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-1 sm:pb-2">
                      <CardTitle className="text-xs sm:text-sm">Pricing Strategy</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <p className="text-xs sm:text-sm text-muted-foreground">{selectedAnalysis.pricing_strategy}</p>
                    </CardContent>
                  </Card>
                </div>

                <Card>
                  <CardHeader className="pb-1 sm:pb-2">
                    <CardTitle className="text-xs sm:text-sm">Marketing Channels</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <p className="text-xs sm:text-sm text-muted-foreground">{selectedAnalysis.marketing_channels}</p>
                  </CardContent>
                </Card>

                {/* SWOT */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <Card className="border-green-500/30">
                    <CardHeader className="pb-1 sm:pb-2">
                      <CardTitle className="text-xs sm:text-sm flex items-center gap-2 text-green-600">
                        <TrendingUp className="w-3 h-3 sm:w-4 sm:h-4" />
                        Strengths
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <p className="text-xs sm:text-sm text-muted-foreground whitespace-pre-line">{selectedAnalysis.strengths}</p>
                    </CardContent>
                  </Card>

                  <Card className="border-red-500/30">
                    <CardHeader className="pb-1 sm:pb-2">
                      <CardTitle className="text-xs sm:text-sm flex items-center gap-2 text-red-600">
                        <TrendingDown className="w-3 h-3 sm:w-4 sm:h-4" />
                        Weaknesses
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <p className="text-xs sm:text-sm text-muted-foreground whitespace-pre-line">{selectedAnalysis.weaknesses}</p>
                    </CardContent>
                  </Card>

                  <Card className="border-blue-500/30">
                    <CardHeader className="pb-1 sm:pb-2">
                      <CardTitle className="text-xs sm:text-sm flex items-center gap-2 text-blue-600">
                        <Lightbulb className="w-3 h-3 sm:w-4 sm:h-4" />
                        Opportunities
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <p className="text-xs sm:text-sm text-muted-foreground whitespace-pre-line">{selectedAnalysis.opportunities}</p>
                    </CardContent>
                  </Card>

                  <Card className="border-yellow-500/30">
                    <CardHeader className="pb-1 sm:pb-2">
                      <CardTitle className="text-xs sm:text-sm flex items-center gap-2 text-yellow-600">
                        <AlertTriangle className="w-3 h-3 sm:w-4 sm:h-4" />
                        Threats
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <p className="text-xs sm:text-sm text-muted-foreground whitespace-pre-line">{selectedAnalysis.threats}</p>
                    </CardContent>
                  </Card>
                </div>
              </div>
            ) : (
              <Card className="py-8 sm:py-12">
                <CardContent className="text-center">
                  <Users className="w-10 h-10 sm:w-12 sm:h-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-base sm:text-lg font-semibold mb-2">No Analysis Yet</h3>
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    Enter a competitor name above to get started.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CompetitorAnalysisPage;
