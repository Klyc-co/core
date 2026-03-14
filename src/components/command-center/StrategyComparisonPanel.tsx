import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { GitCompareArrows, ThumbsUp, AlertTriangle, TrendingUp, Brain } from "lucide-react";

export interface StrategyComparison {
  requested: {
    summary: string;
    platforms: string[];
    goal: string;
    timeline: string;
  };
  recommended: {
    summary: string;
    platforms: string[];
    goal: string;
    timeline: string;
    confidenceScore: number;
    reasoning: string;
    risks: string[];
    upsides: string[];
  };
}

interface Props {
  data: StrategyComparison | null;
}

export default function StrategyComparisonPanel({ data }: Props) {
  if (!data) {
    return (
      <Card className="border-border/60 bg-card/80 backdrop-blur-sm">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-base font-semibold">
            <GitCompareArrows className="w-4 h-4 text-primary" />
            Requested vs Recommended
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-32 text-sm text-muted-foreground">
            Complete signal discovery to generate strategy comparison
          </div>
        </CardContent>
      </Card>
    );
  }

  const confidence = data.recommended.confidenceScore;
  const confidenceColor = confidence >= 80 ? "text-green-500" : confidence >= 60 ? "text-amber-500" : "text-destructive";

  return (
    <Card className="border-border/60 bg-card/80 backdrop-blur-sm">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-base font-semibold">
          <GitCompareArrows className="w-4 h-4 text-primary" />
          Requested vs Recommended
          <Badge variant="outline" className={`ml-auto text-xs font-mono ${confidenceColor}`}>
            {confidence}% confidence
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Requested */}
          <div className="rounded-lg border border-border/50 bg-muted/30 p-4 space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">What You Asked For</h4>
            <p className="text-sm text-foreground leading-relaxed">{data.requested.summary}</p>
            <div className="flex flex-wrap gap-1.5">
              {data.requested.platforms.map((p) => (
                <Badge key={p} variant="secondary" className="text-[10px]">{p}</Badge>
              ))}
            </div>
            <div className="text-xs text-muted-foreground space-y-1">
              <div><span className="font-medium">Goal:</span> {data.requested.goal}</div>
              <div><span className="font-medium">Timeline:</span> {data.requested.timeline}</div>
            </div>
          </div>

          {/* Recommended */}
          <div className="rounded-lg border border-primary/30 bg-primary/5 p-4 space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-primary flex items-center gap-1">
              <Brain className="w-3 h-3" /> KLYC Recommends
            </h4>
            <p className="text-sm text-foreground leading-relaxed">{data.recommended.summary}</p>
            <div className="flex flex-wrap gap-1.5">
              {data.recommended.platforms.map((p) => (
                <Badge key={p} className="text-[10px] bg-primary/15 text-primary border-primary/30">{p}</Badge>
              ))}
            </div>
            <div className="text-xs text-muted-foreground space-y-1">
              <div><span className="font-medium">Goal:</span> {data.recommended.goal}</div>
              <div><span className="font-medium">Timeline:</span> {data.recommended.timeline}</div>
            </div>
          </div>
        </div>

        {/* AI Reasoning */}
        <div className="mt-4 rounded-lg border border-border/40 bg-background/60 p-3 space-y-3">
          <p className="text-xs text-muted-foreground italic leading-relaxed">
            <Brain className="w-3 h-3 inline mr-1 text-primary" />
            {data.recommended.reasoning}
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {data.recommended.upsides.length > 0 && (
              <div className="space-y-1.5">
                <h5 className="text-[10px] uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                  <TrendingUp className="w-3 h-3 text-green-500" /> Upside
                </h5>
                {data.recommended.upsides.map((u, i) => (
                  <p key={i} className="text-xs text-foreground/80 pl-4">• {u}</p>
                ))}
              </div>
            )}
            {data.recommended.risks.length > 0 && (
              <div className="space-y-1.5">
                <h5 className="text-[10px] uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3 text-amber-500" /> Risk
                </h5>
                {data.recommended.risks.map((r, i) => (
                  <p key={i} className="text-xs text-foreground/80 pl-4">• {r}</p>
                ))}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
