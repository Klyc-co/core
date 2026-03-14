import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  FileText, ChevronDown, AlertTriangle,
  Brain, Target, Cpu, Lightbulb, ShieldAlert, Info,
} from "lucide-react";
import type { CampaignBrief, CustomerContext, OrchestratorHints, LearningHooks } from "@/types/normalizer-report";
import type { RawNormalizedObjects } from "@/types/run-status";

// ── Helpers ──────────────────────────────────────────────

const Section = ({ title, icon, defaultOpen, children }: { title: string; icon: React.ReactNode; defaultOpen?: boolean; children: React.ReactNode }) => {
  const [open, setOpen] = useState(defaultOpen ?? false);
  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger className="flex items-center justify-between w-full px-3 py-2.5 rounded-md border border-border/50 bg-background/60 hover:bg-muted/40 transition-colors group">
        <span className="flex items-center gap-2 text-sm font-medium text-foreground">
          {icon}
          {title}
        </span>
        <ChevronDown className={`w-3.5 h-3.5 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
      </CollapsibleTrigger>
      <CollapsibleContent className="border border-t-0 border-border/50 rounded-b-md bg-background/40 px-3 py-3 space-y-3">
        {children}
      </CollapsibleContent>
    </Collapsible>
  );
};

const EmptySection = ({ message }: { message: string }) => (
  <div className="flex items-center gap-2 py-2 text-xs text-muted-foreground italic">
    <Info className="w-3.5 h-3.5 shrink-0" />
    {message}
  </div>
);

const FieldRow = ({ label, value }: { label: string; value: string | null | undefined }) => (
  <div className="flex items-start justify-between gap-4 py-1">
    <span className="text-xs text-muted-foreground shrink-0">{label}</span>
    {!value ? (
      <Badge variant="outline" className="text-[10px] h-5 border-destructive/30 text-destructive bg-destructive/5">Missing</Badge>
    ) : (
      <span className="text-xs text-foreground text-right max-w-[60%] truncate" title={value}>{value}</span>
    )}
  </div>
);

const TagList = ({ items, emptyLabel }: { items?: string[]; emptyLabel?: string }) => {
  if (!items?.length) return <span className="text-[11px] text-muted-foreground italic">{emptyLabel ?? "None"}</span>;
  return (
    <div className="flex flex-wrap gap-1">
      {items.map((t, i) => (
        <Badge key={i} variant="secondary" className="text-[10px] h-5 font-normal">{t}</Badge>
      ))}
    </div>
  );
};

const BoolFlag = ({ label, value }: { label: string; value: boolean }) => (
  <div className="flex items-center justify-between py-0.5">
    <span className="text-xs text-muted-foreground">{label}</span>
    {value ? (
      <Badge variant="outline" className="text-[10px] h-5 border-primary/30 text-primary bg-primary/5">Required</Badge>
    ) : (
      <Badge variant="outline" className="text-[10px] h-5 text-muted-foreground">No</Badge>
    )}
  </div>
);

const ProgressBar = ({ value, label, highThreshold = 70, midThreshold = 40 }: { value: number; label: string; highThreshold?: number; midThreshold?: number }) => {
  const color = value >= highThreshold ? "bg-primary" : value >= midThreshold ? "bg-yellow-500" : "bg-destructive";
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">{label}</span>
        <span className="text-xs font-mono font-semibold text-foreground">{value}%</span>
      </div>
      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${value}%` }} />
      </div>
    </div>
  );
};

const LabelledTags = ({ label, items }: { label: string; items?: string[] }) => (
  <div className="space-y-1">
    <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</span>
    <TagList items={items} emptyLabel="Not provided" />
  </div>
);

// ── Sub-panels ───────────────────────────────────────────

const BriefSection = ({ data }: { data?: CampaignBrief }) => {
  if (!data) return <Section title="Campaign Brief" icon={<Target className="w-3.5 h-3.5 text-primary" />}><EmptySection message="Campaign brief not available from this workflow run" /></Section>;
  return (
    <Section title="Campaign Brief" icon={<Target className="w-3.5 h-3.5 text-primary" />} defaultOpen>
      <ProgressBar value={data.confidenceScore ?? 0} label="Confidence" />
      <div className="divide-y divide-border/30">
        <FieldRow label="Campaign Goal" value={data.campaignGoal} />
        <FieldRow label="Campaign Mode" value={data.campaignMode} />
        <FieldRow label="Geography" value={data.geoFilter} />
        <FieldRow label="Industry" value={data.industryFilter} />
        <FieldRow label="Customer Size" value={data.customerSizeFilter} />
        <FieldRow label="Competitor" value={data.competitorFilter} />
        <FieldRow label="Addressable Market" value={data.addressableMarket} />
        <FieldRow label="Business Need" value={data.businessNeed} />
        <FieldRow label="Regulatory Driver" value={data.regulatoryDriver} />
        <FieldRow label="Product Definition" value={data.productDefinition} />
      </div>
      <div className="space-y-1.5 pt-1">
        <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Platforms</span>
        <div className="flex items-center gap-2 text-xs">
          <span className="text-muted-foreground">Requested:</span>
          <TagList items={data.requestedPlatforms} emptyLabel="None specified" />
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span className="text-muted-foreground">Recommended:</span>
          <TagList items={data.recommendedPlatformsHint} />
        </div>
      </div>
      {(data.warnings?.length ?? 0) > 0 && (
        <div className="rounded-md border border-destructive/20 bg-destructive/5 p-2 space-y-1">
          <span className="flex items-center gap-1.5 text-[10px] font-medium text-destructive uppercase tracking-wider">
            <AlertTriangle className="w-3 h-3" /> Warnings
          </span>
          {data.warnings.map((w, i) => (
            <p key={i} className="text-xs text-destructive/80 pl-4">• {w}</p>
          ))}
        </div>
      )}
    </Section>
  );
};

const ContextSection = ({ data }: { data?: CustomerContext }) => {
  if (!data) return <Section title="Customer Context" icon={<Brain className="w-3.5 h-3.5 text-primary" />}><EmptySection message="Customer context not available from this workflow run" /></Section>;
  return (
    <Section title="Customer Context" icon={<Brain className="w-3.5 h-3.5 text-primary" />}>
      <ProgressBar value={data.contextCoverage ?? 0} label="Context Coverage" highThreshold={80} midThreshold={50} />
      <div className="flex items-center justify-between text-xs pb-1">
        <span className="text-muted-foreground">Sources Loaded</span>
        <span className="font-mono text-foreground">{data.sourceCount ?? 0}</span>
      </div>
      {data.lastUpdated && (
        <div className="flex items-center justify-between text-xs pb-1">
          <span className="text-muted-foreground">Last Updated</span>
          <span className="text-foreground">{new Date(data.lastUpdated).toLocaleDateString()}</span>
        </div>
      )}
      <div className="divide-y divide-border/30">
        <FieldRow label="Brand Voice" value={data.brandVoiceSummary} />
        <FieldRow label="Product Offer" value={data.productOfferSummary} />
      </div>
      <LabelledTags label="Audience Segments" items={data.audienceSegments} />
      <LabelledTags label="Pain Points" items={data.primaryPainPoints} />
      <LabelledTags label="Proof Points" items={data.proofPoints} />
      <LabelledTags label="Competitors" items={data.competitors} />
      <LabelledTags label="Regulations" items={data.regulations} />
      <LabelledTags label="Semantic Themes" items={data.semanticThemes} />
      <LabelledTags label="Trust Signals" items={data.trustSignals} />
      <LabelledTags label="Objections" items={data.objections} />
    </Section>
  );
};

const HintsSection = ({ data }: { data?: OrchestratorHints }) => {
  if (!data) return <Section title="Orchestrator Hints" icon={<Cpu className="w-3.5 h-3.5 text-primary" />}><EmptySection message="Orchestrator hints not available from this workflow run" /></Section>;

  const complexityColor = data.estimatedCampaignComplexity === "high"
    ? "border-destructive/30 text-destructive bg-destructive/5"
    : data.estimatedCampaignComplexity === "medium"
      ? "border-yellow-500/30 text-yellow-600 bg-yellow-500/5"
      : "border-primary/30 text-primary bg-primary/5";

  return (
    <Section title="Orchestrator Hints" icon={<Cpu className="w-3.5 h-3.5 text-primary" />}>
      <div className="flex items-center justify-between pb-1">
        <span className="text-xs text-muted-foreground">Campaign Complexity</span>
        <Badge variant="outline" className={`text-[10px] h-5 capitalize ${complexityColor}`}>{data.estimatedCampaignComplexity}</Badge>
      </div>
      <div className="divide-y divide-border/30">
        <BoolFlag label="Requires Research" value={data.requiresResearch} />
        <BoolFlag label="Requires Product Positioning" value={data.requiresProductPositioning} />
        <BoolFlag label="Requires Narrative Simulation" value={data.requiresNarrativeSimulation} />
        <BoolFlag label="Requires Platform Evaluation" value={data.requiresPlatformEvaluation} />
      </div>
      {(data.missingCriticalInputs?.length ?? 0) > 0 && (
        <div className="rounded-md border border-destructive/20 bg-destructive/5 p-2 space-y-1">
          <span className="flex items-center gap-1.5 text-[10px] font-medium text-destructive uppercase tracking-wider">
            <ShieldAlert className="w-3 h-3" /> Missing Critical Inputs
          </span>
          {data.missingCriticalInputs.map((m, i) => (
            <p key={i} className="text-xs text-destructive/80 pl-4">• {m}</p>
          ))}
        </div>
      )}
    </Section>
  );
};

const LearningSection = ({ data }: { data?: LearningHooks }) => {
  if (!data) return <Section title="Learning Hooks" icon={<Lightbulb className="w-3.5 h-3.5 text-primary" />}><EmptySection message="Learning hooks not available from this workflow run" /></Section>;
  return (
    <Section title="Learning Hooks" icon={<Lightbulb className="w-3.5 h-3.5 text-primary" />}>
      <LabelledTags label="Explicit Inputs" items={data.explicitInputs} />
      <LabelledTags label="Inferred Signals" items={data.inferredSignals} />
      {(data.missingInputs?.length ?? 0) > 0 && (
        <div className="space-y-1">
          <span className="text-[10px] text-destructive uppercase tracking-wider font-medium">Missing Inputs</span>
          <TagList items={data.missingInputs} />
        </div>
      )}
      <LabelledTags label="Confidence Drivers" items={data.confidenceDrivers} />
      <LabelledTags label="Compression Notes" items={data.compressionNotes} />
      <LabelledTags label="Updatable Fields" items={data.updatableFields} />
      <LabelledTags label="Source References" items={data.sourceReferences} />
      {data.recommendedNextUpdate && (
        <div className="rounded-md border border-primary/20 bg-primary/5 p-2 mt-1">
          <span className="flex items-center gap-1.5 text-[10px] font-medium text-primary uppercase tracking-wider">
            Recommended Next Update
          </span>
          <p className="text-xs text-foreground mt-0.5">{data.recommendedNextUpdate}</p>
        </div>
      )}
    </Section>
  );
};

// ── Main Panel ───────────────────────────────────────────

interface Props {
  /** Raw normalized objects from envelope.rawNormalizedObjects */
  report: RawNormalizedObjects | null | undefined;
}

export default function NormalizerReportPanel({ report }: Props) {
  if (!report) {
    return (
      <Card className="border-border/60 bg-card/80 backdrop-blur-sm">
        <CardContent className="flex items-center justify-center py-12">
          <div className="text-center space-y-2">
            <FileText className="w-8 h-8 text-muted-foreground/40 mx-auto" />
            <p className="text-sm text-muted-foreground">Run an analysis to generate the normalizer report</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const missingCount =
    (report.orchestratorHints?.missingCriticalInputs?.length ?? 0) +
    (report.learningHooks?.missingInputs?.length ?? 0);
  const confidence = report.campaignBrief?.confidenceScore ?? 0;
  const coverage = report.customerContext?.contextCoverage ?? 0;

  return (
    <Card className="border-border/60 bg-card/80 backdrop-blur-sm">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2 text-base font-semibold">
            <FileText className="w-4 h-4 text-primary" />
            Normalizer Report
          </span>
          <div className="flex items-center gap-2">
            {missingCount > 0 && (
              <Badge variant="outline" className="text-[10px] h-5 border-destructive/30 text-destructive bg-destructive/5">
                {missingCount} missing
              </Badge>
            )}
            {coverage > 0 && (
              <Badge
                variant="outline"
                className={`text-[10px] h-5 font-mono ${
                  coverage >= 80
                    ? "border-primary/30 text-primary bg-primary/5"
                    : coverage >= 50
                      ? "border-yellow-500/30 text-yellow-600 bg-yellow-500/5"
                      : "border-destructive/30 text-destructive bg-destructive/5"
                }`}
              >
                {coverage}% coverage
              </Badge>
            )}
            <Badge
              variant="outline"
              className={`text-[10px] h-5 font-mono ${
                confidence >= 70
                  ? "border-primary/30 text-primary bg-primary/5"
                  : confidence >= 40
                    ? "border-yellow-500/30 text-yellow-600 bg-yellow-500/5"
                    : "border-destructive/30 text-destructive bg-destructive/5"
              }`}
            >
              {confidence}% confidence
            </Badge>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <BriefSection data={report.campaignBrief} />
        <ContextSection data={report.customerContext} />
        <HintsSection data={report.orchestratorHints} />
        <LearningSection data={report.learningHooks} />
      </CardContent>
    </Card>
  );
}
