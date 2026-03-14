import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, Flame, Zap, TrendingUp, ShieldCheck, Eye, Target, Sparkles } from "lucide-react";
import { useState } from "react";

export interface NarrativeCandidate {
  id: string;
  narrativeType: string;
  coreClaim: string;
  noveltyScore: number;
  emotionalEnergy: number;
  platformFit: Record<string, number>;
  competitiveContrast: string;
  urgency: "high" | "medium" | "low";
  preLaunchScore: number;
  predictedViralScore: number;
  predictedConversionScore: number;
  clarity: number;
  trust: number;
}

const MOCK_NARRATIVES: NarrativeCandidate[] = [
  {
    id: "n1",
    narrativeType: "Challenger",
    coreClaim: "Your marketing team shouldn't need 6 tools to think straight.",
    noveltyScore: 82,
    emotionalEnergy: 91,
    platformFit: { LinkedIn: 88, X: 76, Reddit: 72, YouTube: 65 },
    competitiveContrast: "Directly undermines Jasper's multi-tool workflow dependency.",
    urgency: "high",
    preLaunchScore: 84,
    predictedViralScore: 72,
    predictedConversionScore: 68,
    clarity: 90,
    trust: 78,
  },
  {
    id: "n2",
    narrativeType: "Authority",
    coreClaim: "KLYC remembers every campaign you've ever run — and learns from all of them.",
    noveltyScore: 74,
    emotionalEnergy: 68,
    platformFit: { LinkedIn: 92, X: 60, Reddit: 55, YouTube: 80 },
    competitiveContrast: "No competitor offers persistent brand memory across campaigns.",
    urgency: "medium",
    preLaunchScore: 79,
    predictedViralScore: 58,
    predictedConversionScore: 81,
    clarity: 85,
    trust: 92,
  },
  {
    id: "n3",
    narrativeType: "Provocateur",
    coreClaim: "AI marketing without memory is just expensive autocomplete.",
    noveltyScore: 95,
    emotionalEnergy: 96,
    platformFit: { LinkedIn: 70, X: 94, Reddit: 90, YouTube: 55 },
    competitiveContrast: "Reframes the entire AI content market as inadequate.",
    urgency: "high",
    preLaunchScore: 88,
    predictedViralScore: 91,
    predictedConversionScore: 52,
    clarity: 76,
    trust: 64,
  },
];

function ScoreBar({ label, value, icon }: { label: string; value: number; icon?: React.ReactNode }) {
  const color = value >= 80 ? "bg-green-500" : value >= 60 ? "bg-amber-500" : "bg-destructive";
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground flex items-center gap-1">{icon}{label}</span>
        <span className="font-mono font-semibold text-foreground">{value}</span>
      </div>
      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

function UrgencyBadge({ urgency }: { urgency: "high" | "medium" | "low" }) {
  const styles = {
    high: "bg-destructive/10 text-destructive border-destructive/30",
    medium: "bg-amber-500/10 text-amber-600 border-amber-500/30",
    low: "bg-muted text-muted-foreground border-border",
  };
  return <Badge variant="outline" className={`text-xs ${styles[urgency]}`}>{urgency} urgency</Badge>;
}

function NarrativeCard({ narrative }: { narrative: NarrativeCandidate }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <Card className="hover:border-primary/30 transition-colors">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div>
            <Badge className="mb-2 text-xs">{narrative.narrativeType}</Badge>
            <p className="text-sm font-semibold text-foreground leading-snug">{narrative.coreClaim}</p>
          </div>
          <div className="text-right shrink-0">
            <div className="text-2xl font-bold text-primary font-mono">{narrative.preLaunchScore}</div>
            <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Pre-launch</div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 pt-0">
        <div className="flex items-center gap-2 flex-wrap">
          <UrgencyBadge urgency={narrative.urgency} />
        </div>

        <div className="grid grid-cols-2 gap-x-4 gap-y-2">
          <ScoreBar label="Novelty" value={narrative.noveltyScore} icon={<Sparkles className="w-3 h-3" />} />
          <ScoreBar label="Emotion" value={narrative.emotionalEnergy} icon={<Flame className="w-3 h-3" />} />
          <ScoreBar label="Viral" value={narrative.predictedViralScore} icon={<Zap className="w-3 h-3" />} />
          <ScoreBar label="Conversion" value={narrative.predictedConversionScore} icon={<TrendingUp className="w-3 h-3" />} />
          <ScoreBar label="Clarity" value={narrative.clarity} icon={<Eye className="w-3 h-3" />} />
          <ScoreBar label="Trust" value={narrative.trust} icon={<ShieldCheck className="w-3 h-3" />} />
        </div>

        <Collapsible open={expanded} onOpenChange={setExpanded}>
          <CollapsibleTrigger className="flex items-center gap-1 text-xs text-primary hover:underline pt-1">
            <ChevronDown className={`w-3 h-3 transition-transform ${expanded ? "rotate-180" : ""}`} />
            {expanded ? "Hide details" : "Platform fit & competitive contrast"}
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-2 space-y-3">
            <div>
              <div className="text-xs font-medium text-muted-foreground mb-1.5">Platform Fit</div>
              <div className="space-y-1.5">
                {Object.entries(narrative.platformFit).map(([platform, score]) => (
                  <ScoreBar key={platform} label={platform} value={score} icon={<Target className="w-3 h-3" />} />
                ))}
              </div>
            </div>
            <div>
              <div className="text-xs font-medium text-muted-foreground mb-1">Competitive Contrast</div>
              <p className="text-xs text-foreground/80 leading-relaxed">{narrative.competitiveContrast}</p>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  );
}

export default function NarrativeSimulationArena({ narratives }: { narratives?: NarrativeCandidate[] }) {
  const data = narratives || MOCK_NARRATIVES;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
          <Zap className="w-5 h-5 text-primary" />
          Narrative Simulation Arena
        </h2>
        <Badge variant="outline" className="text-xs font-mono">{data.length} candidates</Badge>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {data.map((n) => (
          <NarrativeCard key={n.id} narrative={n} />
        ))}
      </div>
    </div>
  );
}
