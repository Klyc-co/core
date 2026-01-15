import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import ClientHeader from "@/components/ClientHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  ArrowLeft, 
  Users, 
  Loader2, 
  Search,
  Building2,
  Target,
  TrendingUp,
  TrendingDown,
  Eye
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import type { User } from "@supabase/supabase-js";

interface CompetitorAnalysis {
  id: string;
  competitor_name: string;
  competitor_url: string | null;
  company_description: string | null;
  target_audience: string | null;
  value_proposition: string | null;
  strengths: string | null;
  weaknesses: string | null;
  opportunities: string | null;
  threats: string | null;
  key_products: string | null;
  pricing_strategy: string | null;
  marketing_channels: string | null;
  analyzed_at: string;
}

const ClientCompetitorAnalysis = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [user, setUser] = useState<User | null>(null);
  const [analyses, setAnalyses] = useState<CompetitorAnalysis[]>([]);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [competitorName, setCompetitorName] = useState("");
  const [competitorUrl, setCompetitorUrl] = useState("");
  const [viewingAnalysis, setViewingAnalysis] = useState<CompetitorAnalysis | null>(null);

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/client/auth");
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

    if (error) {
      console.error('Error fetching analyses:', error);
    } else {
      setAnalyses(data || []);
    }
    setLoading(false);
  };

  const handleAnalyze = async () => {
    if (!competitorName || !user) {
      toast({ title: "Missing competitor name", variant: "destructive" });
      return;
    }

    setAnalyzing(true);

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
        description: `Generated SWOT analysis for ${competitorName}`,
      });
      
      setCompetitorName("");
      setCompetitorUrl("");
      fetchAnalyses(user.id);
    } catch (error) {
      console.error('Error analyzing competitor:', error);
      toast({
        title: "Error",
        description: "Failed to analyze competitor. Please try again.",
        variant: "destructive",
      });
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <ClientHeader user={user} />
      
      <div className="border-b border-border bg-card/50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => navigate("/client/strategy")}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Strategy
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-foreground">Competitor Analysis</h1>
          <p className="text-muted-foreground">AI-powered SWOT analysis of your competitors</p>
        </div>

        {/* Analyze Form */}
        <Card className="mb-8">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                <Users className="w-5 h-5 text-purple-500" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Analyze a Competitor</h3>
                <p className="text-sm text-muted-foreground">Enter a competitor's name and optionally their website</p>
              </div>
            </div>

            <div className="flex gap-3">
              <Input
                placeholder="Competitor name (e.g., Nike)"
                value={competitorName}
                onChange={(e) => setCompetitorName(e.target.value)}
                className="flex-1"
              />
              <Input
                placeholder="Website URL (optional)"
                value={competitorUrl}
                onChange={(e) => setCompetitorUrl(e.target.value)}
                className="flex-1"
              />
              <Button 
                onClick={handleAnalyze}
                disabled={!competitorName || analyzing}
                className="gap-2"
              >
                {analyzing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Search className="w-4 h-4" />
                    Analyze
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Analyses List */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : analyses.length === 0 ? (
          <Card className="p-12 text-center border-dashed">
            <Users className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">No competitor analyses yet</h3>
            <p className="text-muted-foreground">
              Enter a competitor's name above to generate an AI-powered SWOT analysis
            </p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {analyses.map((analysis) => (
              <Card key={analysis.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => setViewingAnalysis(analysis)}>
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                        <Building2 className="w-5 h-5 text-muted-foreground" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-foreground">{analysis.competitor_name}</h4>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(analysis.analyzed_at), "MMM d, yyyy")}
                        </p>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm">
                      <Eye className="w-4 h-4" />
                    </Button>
                  </div>
                  
                  {analysis.company_description && (
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {analysis.company_description}
                    </p>
                  )}
                  
                  <div className="flex gap-2 mt-3">
                    {analysis.strengths && <Badge variant="secondary" className="text-green-600">Strengths</Badge>}
                    {analysis.weaknesses && <Badge variant="secondary" className="text-red-600">Weaknesses</Badge>}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Analysis Detail Dialog */}
      <Dialog open={!!viewingAnalysis} onOpenChange={() => setViewingAnalysis(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="w-5 h-5" />
              {viewingAnalysis?.competitor_name}
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh]">
            {viewingAnalysis && (
              <div className="space-y-6 p-4">
                {viewingAnalysis.company_description && (
                  <div>
                    <h4 className="font-medium text-foreground mb-2">Company Overview</h4>
                    <p className="text-muted-foreground">{viewingAnalysis.company_description}</p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  {viewingAnalysis.strengths && (
                    <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <TrendingUp className="w-4 h-4 text-green-600" />
                        <h4 className="font-medium text-green-700 dark:text-green-400">Strengths</h4>
                      </div>
                      <p className="text-sm text-green-800 dark:text-green-300">{viewingAnalysis.strengths}</p>
                    </div>
                  )}
                  
                  {viewingAnalysis.weaknesses && (
                    <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <TrendingDown className="w-4 h-4 text-red-600" />
                        <h4 className="font-medium text-red-700 dark:text-red-400">Weaknesses</h4>
                      </div>
                      <p className="text-sm text-red-800 dark:text-red-300">{viewingAnalysis.weaknesses}</p>
                    </div>
                  )}
                  
                  {viewingAnalysis.opportunities && (
                    <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <Target className="w-4 h-4 text-blue-600" />
                        <h4 className="font-medium text-blue-700 dark:text-blue-400">Opportunities</h4>
                      </div>
                      <p className="text-sm text-blue-800 dark:text-blue-300">{viewingAnalysis.opportunities}</p>
                    </div>
                  )}
                  
                  {viewingAnalysis.threats && (
                    <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <Users className="w-4 h-4 text-amber-600" />
                        <h4 className="font-medium text-amber-700 dark:text-amber-400">Threats</h4>
                      </div>
                      <p className="text-sm text-amber-800 dark:text-amber-300">{viewingAnalysis.threats}</p>
                    </div>
                  )}
                </div>

                {viewingAnalysis.target_audience && (
                  <div>
                    <h4 className="font-medium text-foreground mb-2">Target Audience</h4>
                    <p className="text-muted-foreground">{viewingAnalysis.target_audience}</p>
                  </div>
                )}

                {viewingAnalysis.value_proposition && (
                  <div>
                    <h4 className="font-medium text-foreground mb-2">Value Proposition</h4>
                    <p className="text-muted-foreground">{viewingAnalysis.value_proposition}</p>
                  </div>
                )}

                {viewingAnalysis.marketing_channels && (
                  <div>
                    <h4 className="font-medium text-foreground mb-2">Marketing Channels</h4>
                    <p className="text-muted-foreground">{viewingAnalysis.marketing_channels}</p>
                  </div>
                )}
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ClientCompetitorAnalysis;
