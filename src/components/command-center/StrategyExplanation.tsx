import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Brain, Monitor, Users, MessageSquare, ShieldCheck, AlertTriangle,
  Info, Lightbulb, ArrowRight,
} from "lucide-react";
import type { WorkflowReportEnvelope } from "@/types/run-status";

interface Props {
  envelope: WorkflowReportEnvelope | null;
}

function ConfidenceMeter({ score }: { score: number | null }) {
  if (score === null) return null;
  const color = score >= 80 ? "bg-primary" : score >= 50 ? "bg-yellow-500" : "bg-destructive";
  const textColor = score >= 80 ? "text-primary" : score >= 50 ? "text-yellow-600" : "text-destructive";
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Overall Confidence</span>
        <span className={`text-sm font-bold font-mono ${textColor}`}>{score}%</span>
      </div>
      <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-700 ${color}`} style={{ width: `${score}%` }} />
      </div>
    </div>
  );
}

export default function StrategyExplanation({ envelope }: Props) {
  const brief = envelope?.rawNormalizedObjects?.campaignBrief;
  const ctx = envelope?.rawNormalizedObjects?.customerContext;
  const hints = envelope?.rawNormalizedObjects?.orchestratorHints;
  const orch = envelope?.orchestrationSummary;
  const confidence = brief?.confidenceScore ?? null;

  const isEmpty = !brief && !ctx && !hints;

  // Derive platform reasoning
  const requestedPlatforms = brief?.requestedPlatforms ?? [];
  const recommendedPlatforms = brief?.recommendedPlatformsHint ?? [];
  const platformsDiffer = requestedPlatforms.length > 0 &&
    JSON.stringify(requestedPlatforms.sort()) !== JSON.stringify(recommendedPlatforms.sort());

  // Derive audience reasoning
  const segments = ctx?.audienceSegments ?? [];
  const painPoints = ctx?.primaryPainPoints ?? [];

  // Derive message reasoning
  const themes = ctx?.semanticThemes ?? [];
  const mode = brief?.campaignMode;
  const complexity = orch?.estimatedComplexity ?? hints?.estimatedCampaignComplexity;

  return (
    <Card className="border-border/60">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Brain className="w-4 h-4 text-primary" />
            AI Strategy Explanation
          </CardTitle>
          {confidence !== null && (
            <Badge
              variant="outline"
              className={`text-[10px] h-5 font-mono ${
                confidence >= 80 ? "bg-primary/10 text-primary border-primary/20" :
                confidence >= 50 ? "bg-yellow-500/10 text-yellow-600 border-yellow-500/20" :
                "bg-destructive/10 text-destructive border-destructive/20"
              }`}
            >
              {confidence}%
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-5">
        {isEmpty ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Info className="w-8 h-8 text-muted-foreground/40 mb-2" />
            <p className="text-sm text-muted-foreground">No strategy explanation available</p>
            <p className="text-xs text-muted-foreground/60 mt-1">Run an analysis to see how the AI built the campaign</p>
          </div>
        ) : (
          <>
            {/* Confidence */}
            <ConfidenceMeter score={confidence} />

            {/* Platform Selection Reasoning */}
            <Section title="Platform Selection" icon={<Monitor className="w-3.5 h-3.5 text-primary" />}>
              {recommendedPlatforms.length > 0 ? (
                <div className="space-y-2">
                  <div className="flex flex-wrap gap-1.5">
                    {recommendedPlatforms.map((p, i) => (
                      <Badge
                        key={p}
                        variant="outline"
                        className={`text-[10px] h-5 gap-1 ${
                          i === 0 ? "bg-primary/10 text-primary border-primary/20" : "bg-card text-foreground border-border"
                        }`}
                      >
                        <Monitor className="w-2.5 h-2.5" />
                        {p}
                      </Badge>
                    ))}
                  </div>
                  {platformsDiffer && (
                    <div className="flex items-start gap-2 px-2.5 py-2 rounded-lg bg-accent/5 border border-accent/10">
                      <Lightbulb className="w-3.5 h-3.5 text-accent mt-0.5 shrink-0" />
                      <div className="text-[11px] text-foreground/80">
                        <span className="font-medium">AI adjusted platforms:</span> You requested{" "}
                        {requestedPlatforms.join(", ")} but the AI recommends{" "}
                        {recommendedPlatforms.join(", ")} based on audience fit
                        {ctx?.contextCoverage ? ` and ${ctx.contextCoverage}% context coverage` : ""}.
                      </div>
                    </div>
                  )}
                  {hints?.requiresPlatformEvaluation && (
                    <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                      <ArrowRight className="w-3 h-3" />
                      Platform evaluation agent was activated for deeper analysis
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground italic">No platform recommendations generated</p>
              )}
            </Section>

            {/* Audience Targeting Logic */}
            <Section title="Audience Targeting" icon={<Users className="w-3.5 h-3.5 text-primary" />}>
              {segments.length > 0 || painPoints.length > 0 ? (
                <div className="space-y-2">
                  {segments.length > 0 && (
                    <div>
                      <span className="text-[10px] text-muted-foreground font-medium">Segments identified:</span>
                      <div className="flex flex-wrap gap-1.5 mt-1">
                        {segments.map((s, i) => (
                          <Badge key={i} variant="outline" className="text-[10px] h-5 bg-card border-border text-foreground">
                            {s}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  {painPoints.length > 0 && (
                    <div>
                      <span className="text-[10px] text-muted-foreground font-medium">Pain points addressed:</span>
                      <ul className="mt-1 space-y-0.5">
                        {painPoints.slice(0, 4).map((p, i) => (
                          <li key={i} className="flex items-start gap-1.5 text-[11px] text-foreground/80">
                            <span className="w-1 h-1 rounded-full bg-destructive mt-1.5 shrink-0" />
                            {p}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground italic">No audience targeting data available</p>
              )}
            </Section>

            {/* Message Strategy */}
            <Section title="Message Strategy" icon={<MessageSquare className="w-3.5 h-3.5 text-primary" />}>
              <div className="space-y-2">
                {mode && (
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-muted-foreground font-medium">Campaign mode:</span>
                    <Badge variant="outline" className="text-[10px] h-5 capitalize bg-card border-border text-foreground">
                      {mode}
                    </Badge>
                  </div>
                )}
                {complexity && (
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-muted-foreground font-medium">Complexity:</span>
                    <Badge variant="outline" className={`text-[10px] h-5 capitalize ${
                      complexity === "high" ? "bg-destructive/10 text-destructive border-destructive/20" :
                      complexity === "medium" ? "bg-yellow-500/10 text-yellow-600 border-yellow-500/20" :
                      "bg-primary/10 text-primary border-primary/20"
                    }`}>
                      {complexity}
                    </Badge>
                  </div>
                )}
                {themes.length > 0 && (
                  <div>
                    <span className="text-[10px] text-muted-foreground font-medium">Semantic themes driving messaging:</span>
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {themes.map((t, i) => (
                        <Badge key={i} variant="outline" className="text-[10px] h-5 bg-card border-border text-foreground">
                          {t}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                {hints?.requiresNarrativeSimulation && (
                  <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                    <ArrowRight className="w-3 h-3" />
                    Narrative simulation was used to optimize messaging angles
                  </p>
                )}
                {themes.length === 0 && !mode && (
                  <p className="text-xs text-muted-foreground italic">No messaging strategy data available</p>
                )}
              </div>
            </Section>

            {/* Warnings */}
            {(brief?.warnings?.length ?? 0) > 0 && (
              <Section title="Warnings" icon={<AlertTriangle className="w-3.5 h-3.5 text-yellow-600" />}>
                <div className="space-y-1">
                  {brief!.warnings.map((w, i) => (
                    <div key={i} className="flex items-start gap-1.5 px-2 py-1.5 rounded bg-yellow-500/5 border border-yellow-500/10">
                      <AlertTriangle className="w-3 h-3 text-yellow-600 mt-0.5 shrink-0" />
                      <span className="text-[10px] text-yellow-700">{w}</span>
                    </div>
                  ))}
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
