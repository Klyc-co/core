import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Users, Target, Lightbulb, TrendingUp, TrendingDown, AlertTriangle, Loader2, Search, Globe, Trash2,
} from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";

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

export default function CompetitorAnalysisContent() {
  const { toast } = useToast();
  const [competitorName, setCompetitorName] = useState("");
  const [competitorUrl, setCompetitorUrl] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analyses, setAnalyses] = useState<CompetitorAnalysis[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAnalysis, setSelectedAnalysis] = useState<CompetitorAnalysis | null>(null);

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from("competitor_analyses").select("*").eq("user_id", user.id).order("analyzed_at", { ascending: false });
      if (data) {
        setAnalyses(data as CompetitorAnalysis[]);
        if (data.length > 0) setSelectedAnalysis(data[0] as CompetitorAnalysis);
      }
      setLoading(false);
    };
    init();
  }, []);

  const handleAnalyze = async () => {
    if (!competitorName) return;
    setIsAnalyzing(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data, error } = await supabase.functions.invoke("analyze-competitor", {
        body: { competitorName, competitorUrl: competitorUrl || null, userId: user.id },
      });
      if (error) throw error;
      toast({ title: "Analysis complete!", description: `Analyzed ${competitorName}` });
      setCompetitorName("");
      setCompetitorUrl("");
      // Refresh
      const { data: refreshed } = await supabase.from("competitor_analyses").select("*").eq("user_id", user.id).order("analyzed_at", { ascending: false });
      if (refreshed) {
        setAnalyses(refreshed as CompetitorAnalysis[]);
        if (data?.analysis) setSelectedAnalysis(data.analysis);
      }
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleDelete = async (id: string) => {
    await supabase.from("competitor_analyses").delete().eq("id", id);
    setAnalyses(analyses.filter(a => a.id !== id));
    if (selectedAnalysis?.id === id) setSelectedAnalysis(analyses.find(a => a.id !== id) || null);
    toast({ title: "Deleted" });
  };

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;

  return (
    <div className="mt-4 space-y-4">
      {/* Input */}
      <Card>
        <CardContent className="pt-4 space-y-3">
          <h3 className="text-base font-semibold flex items-center gap-2"><Search className="w-4 h-4" /> Analyze a Competitor</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium mb-1 block">Competitor Name *</label>
              <Input placeholder="e.g., Notion, Slack" value={competitorName} onChange={(e) => setCompetitorName(e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block flex items-center gap-1"><Globe className="w-3 h-3" />Website (optional)</label>
              <Input placeholder="https://competitor.com" value={competitorUrl} onChange={(e) => setCompetitorUrl(e.target.value)} />
            </div>
          </div>
          <Button onClick={handleAnalyze} disabled={isAnalyzing || !competitorName} className="w-full">
            {isAnalyzing ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Analyzing...</> : <><Search className="w-4 h-4 mr-2" />Analyze Competitor</>}
          </Button>
        </CardContent>
      </Card>

      {/* Previous analyses selector */}
      {analyses.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          {analyses.map(a => (
            <Badge
              key={a.id}
              variant={selectedAnalysis?.id === a.id ? "default" : "outline"}
              className="cursor-pointer"
              onClick={() => setSelectedAnalysis(a)}
            >
              {a.competitor_name}
            </Badge>
          ))}
        </div>
      )}

      {/* Results */}
      {selectedAnalysis && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold">{selectedAnalysis.competitor_name}</h2>
              {selectedAnalysis.competitor_url && <a href={selectedAnalysis.competitor_url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline">{selectedAnalysis.competitor_url}</a>}
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline">{format(new Date(selectedAnalysis.analyzed_at), "MMM d, yyyy")}</Badge>
              <Button variant="ghost" size="icon" onClick={() => handleDelete(selectedAnalysis.id)} className="text-destructive"><Trash2 className="w-4 h-4" /></Button>
            </div>
          </div>

          <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Company Overview</CardTitle></CardHeader><CardContent><p className="text-sm text-muted-foreground">{selectedAnalysis.company_description}</p></CardContent></Card>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Card><CardHeader className="pb-1"><CardTitle className="text-sm flex items-center gap-2"><Target className="w-4 h-4 text-primary" />Target Audience</CardTitle></CardHeader><CardContent className="pt-0"><p className="text-sm text-muted-foreground">{selectedAnalysis.target_audience}</p></CardContent></Card>
            <Card><CardHeader className="pb-1"><CardTitle className="text-sm flex items-center gap-2"><Lightbulb className="w-4 h-4 text-yellow-500" />Value Proposition</CardTitle></CardHeader><CardContent className="pt-0"><p className="text-sm text-muted-foreground">{selectedAnalysis.value_proposition}</p></CardContent></Card>
            <Card><CardHeader className="pb-1"><CardTitle className="text-sm">Key Products</CardTitle></CardHeader><CardContent className="pt-0"><p className="text-sm text-muted-foreground">{selectedAnalysis.key_products}</p></CardContent></Card>
            <Card><CardHeader className="pb-1"><CardTitle className="text-sm">Pricing Strategy</CardTitle></CardHeader><CardContent className="pt-0"><p className="text-sm text-muted-foreground">{selectedAnalysis.pricing_strategy}</p></CardContent></Card>
          </div>

          <Card><CardHeader className="pb-1"><CardTitle className="text-sm">Marketing Channels</CardTitle></CardHeader><CardContent className="pt-0"><p className="text-sm text-muted-foreground">{selectedAnalysis.marketing_channels}</p></CardContent></Card>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Card className="border-green-500/30"><CardHeader className="pb-1"><CardTitle className="text-sm flex items-center gap-2 text-green-600"><TrendingUp className="w-4 h-4" />Strengths</CardTitle></CardHeader><CardContent className="pt-0"><p className="text-sm text-muted-foreground whitespace-pre-line">{selectedAnalysis.strengths}</p></CardContent></Card>
            <Card className="border-red-500/30"><CardHeader className="pb-1"><CardTitle className="text-sm flex items-center gap-2 text-red-600"><TrendingDown className="w-4 h-4" />Weaknesses</CardTitle></CardHeader><CardContent className="pt-0"><p className="text-sm text-muted-foreground whitespace-pre-line">{selectedAnalysis.weaknesses}</p></CardContent></Card>
            <Card className="border-blue-500/30"><CardHeader className="pb-1"><CardTitle className="text-sm flex items-center gap-2 text-blue-600"><Lightbulb className="w-4 h-4" />Opportunities</CardTitle></CardHeader><CardContent className="pt-0"><p className="text-sm text-muted-foreground whitespace-pre-line">{selectedAnalysis.opportunities}</p></CardContent></Card>
            <Card className="border-yellow-500/30"><CardHeader className="pb-1"><CardTitle className="text-sm flex items-center gap-2 text-yellow-600"><AlertTriangle className="w-4 h-4" />Threats</CardTitle></CardHeader><CardContent className="pt-0"><p className="text-sm text-muted-foreground whitespace-pre-line">{selectedAnalysis.threats}</p></CardContent></Card>
          </div>
        </div>
      )}
    </div>
  );
}
