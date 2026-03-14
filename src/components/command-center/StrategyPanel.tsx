import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Target, Users, AlertTriangle, Layers, Monitor, ShieldCheck,
  TrendingUp, Info,
} from "lucide-react";
import type { RawNormalizedObjects } from "@/types/run-status";

interface Props {
  data: RawNormalizedObjects | null;
}

function ConfidenceBadge({ score }: { score: number | null }) {
  if (score === null) return null;
  const color =
    score >= 80 ? "bg-primary/10 text-primary border-primary/20" :
    score >= 50 ? "bg-yellow-500/10 text-yellow-600 border-yellow-500/20" :
    "bg-destructive/10 text-destructive border-destructive/20";
  return (
    <Badge variant="outline" className={`text-[10px] h-5 font-mono ${color}`}>
      {score}% confidence
    </Badge>
  );
}

function TagList({ items, icon, emptyText }: { items: string[]; icon: React.ReactNode; emptyText: string }) {
  if (!items.length) {
    return <p className="text-xs text-muted-foreground italic">{emptyText}</p>;
  }
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((item, i) => (
        <Badge key={i} variant="outline" className="text-[10px] h-5 gap-1 bg-card border-border text-foreground">
          {icon}
          {item}
        </Badge>
      ))}
    </div>
  );
}

export default function StrategyPanel({ data }: Props) {
  const brief = data?.campaignBrief;
  const ctx = data?.customerContext;
  const confidence = brief?.confidenceScore ?? null;

  const isEmpty = !brief && !ctx;

  return (
    <Card className="border-border/60">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-primary" />
            Strategy Intelligence
          </CardTitle>
          <ConfidenceBadge score={confidence} />
        </div>
      </CardHeader>

      <CardContent className="space-y-5">
        {isEmpty ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Info className="w-8 h-8 text-muted-foreground/40 mb-2" />
            <p className="text-sm text-muted-foreground">No strategy data available</p>
            <p className="text-xs text-muted-foreground/60 mt-1">Run an analysis to populate this panel</p>
          </div>
        ) : (
          <>
            {/* Campaign Goal */}
            <Section title="Campaign Goal" icon={<Target className="w-3.5 h-3.5 text-primary" />}>
              {brief?.campaignGoal ? (
                <p className="text-sm text-foreground leading-relaxed">{brief.campaignGoal}</p>
              ) : (
                <p className="text-xs text-muted-foreground italic">No campaign goal defined</p>
              )}
            </Section>

            {/* Audience Segments */}
            <Section title="Audience Segments" icon={<Users className="w-3.5 h-3.5 text-primary" />}>
              <TagList
                items={ctx?.audienceSegments ?? []}
                icon={<Users className="w-2.5 h-2.5" />}
                emptyText="No audience segments identified"
              />
            </Section>

            {/* Primary Pain Points */}
            <Section title="Primary Pain Points" icon={<AlertTriangle className="w-3.5 h-3.5 text-primary" />}>
              {(ctx?.primaryPainPoints?.length ?? 0) > 0 ? (
                <ul className="space-y-1">
                  {ctx!.primaryPainPoints.map((point, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs text-foreground">
                      <span className="w-1 h-1 rounded-full bg-destructive mt-1.5 shrink-0" />
                      {point}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-muted-foreground italic">No pain points identified</p>
              )}
            </Section>

            {/* Semantic Themes */}
            <Section title="Semantic Themes" icon={<Layers className="w-3.5 h-3.5 text-primary" />}>
              <TagList
                items={ctx?.semanticThemes ?? []}
                icon={<Layers className="w-2.5 h-2.5" />}
                emptyText="No semantic themes extracted"
              />
            </Section>

            {/* Recommended Platforms */}
            <Section title="Recommended Platforms" icon={<Monitor className="w-3.5 h-3.5 text-primary" />}>
              {(brief?.recommendedPlatformsHint?.length ?? 0) > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {brief!.recommendedPlatformsHint.map((platform, i) => (
                    <Badge
                      key={i}
                      variant="outline"
                      className={`text-[10px] h-5 gap-1 ${
                        i === 0
                          ? "bg-primary/10 text-primary border-primary/20"
                          : "bg-card text-foreground border-border"
                      }`}
                    >
                      <Monitor className="w-2.5 h-2.5" />
                      {platform}
                      {i === 0 && <span className="text-[8px] opacity-70">PRIMARY</span>}
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground italic">No platform recommendations</p>
              )}
            </Section>

            {/* Confidence Breakdown */}
            {confidence !== null && (
              <Section title="Confidence" icon={<ShieldCheck className="w-3.5 h-3.5 text-primary" />}>
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          confidence >= 80 ? "bg-primary" : confidence >= 50 ? "bg-yellow-500" : "bg-destructive"
                        }`}
                        style={{ width: `${confidence}%` }}
                      />
                    </div>
                    <span className="text-xs font-mono text-foreground font-medium w-10 text-right">{confidence}%</span>
                  </div>
                  {(brief?.warnings?.length ?? 0) > 0 && (
                    <div className="space-y-1 mt-2">
                      {brief!.warnings.map((w, i) => (
                        <div key={i} className="flex items-start gap-1.5 px-2 py-1 rounded bg-yellow-500/5 border border-yellow-500/10">
                          <AlertTriangle className="w-3 h-3 text-yellow-600 mt-0.5 shrink-0" />
                          <span className="text-[10px] text-yellow-700">{w}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </Section>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

function Section({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5">
        {icon}
        <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider">{title}</h3>
      </div>
      {children}
    </div>
  );
}
