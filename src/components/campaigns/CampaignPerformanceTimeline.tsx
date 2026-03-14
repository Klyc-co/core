import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  ChevronDown,
  Activity,
  TrendingUp,
  Zap,
  Radio,
  Flame,
  BarChart3,
  ArrowUpRight,
  ArrowRight,
  Pause,
  Archive,
  Brain,
  Lightbulb,
  RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ── Types ──────────────────────────────────────────────────────

export type CheckpointState = "amplify" | "monitor" | "archive";

export interface CheckpointMetrics {
  engagementTotal: number;
  velocity: number;
  acceleration: number;
  novelty: number;
  cascadeDepth: number;
  communitySpread: number;
  emotionalEnergy: number;
  viralScore: number;
  state: CheckpointState;
}

export interface Checkpoint {
  label: string;
  minutesMark: number;
  metrics: CheckpointMetrics;
  isActive: boolean;
  isFuture: boolean;
}

export interface LearningUpdate {
  learned: string[];
  platformPreferenceChanges: string[];
  narrativePreferenceChanges: string[];
  ctaThemeImprovements: string[];
  nextExperiments: string[];
}

export interface CampaignPerformanceTimelineProps {
  checkpoints?: Checkpoint[];
  learning?: LearningUpdate;
  campaignTitle?: string;
}

// ── Mock data ──────────────────────────────────────────────────

const MOCK_CHECKPOINTS: Checkpoint[] = [
  {
    label: "1 min",
    minutesMark: 1,
    isActive: false,
    isFuture: false,
    metrics: {
      engagementTotal: 14,
      velocity: 14.0,
      acceleration: 0,
      novelty: 92,
      cascadeDepth: 0,
      communitySpread: 1,
      emotionalEnergy: 88,
      viralScore: 12,
      state: "monitor",
    },
  },
  {
    label: "5 min",
    minutesMark: 5,
    isActive: false,
    isFuture: false,
    metrics: {
      engagementTotal: 87,
      velocity: 17.4,
      acceleration: 3.4,
      novelty: 85,
      cascadeDepth: 2,
      communitySpread: 4,
      emotionalEnergy: 82,
      viralScore: 34,
      state: "monitor",
    },
  },
  {
    label: "15 min",
    minutesMark: 15,
    isActive: false,
    isFuture: false,
    metrics: {
      engagementTotal: 342,
      velocity: 22.8,
      acceleration: 5.4,
      novelty: 78,
      cascadeDepth: 4,
      communitySpread: 12,
      emotionalEnergy: 76,
      viralScore: 61,
      state: "amplify",
    },
  },
  {
    label: "30 min",
    minutesMark: 30,
    isActive: true,
    isFuture: false,
    metrics: {
      engagementTotal: 891,
      velocity: 29.7,
      acceleration: 6.9,
      novelty: 64,
      cascadeDepth: 6,
      communitySpread: 28,
      emotionalEnergy: 71,
      viralScore: 78,
      state: "amplify",
    },
  },
  {
    label: "1 hr",
    minutesMark: 60,
    isActive: false,
    isFuture: true,
    metrics: {
      engagementTotal: 0,
      velocity: 0,
      acceleration: 0,
      novelty: 0,
      cascadeDepth: 0,
      communitySpread: 0,
      emotionalEnergy: 0,
      viralScore: 0,
      state: "monitor",
    },
  },
  {
    label: "2 hr",
    minutesMark: 120,
    isActive: false,
    isFuture: true,
    metrics: {
      engagementTotal: 0,
      velocity: 0,
      acceleration: 0,
      novelty: 0,
      cascadeDepth: 0,
      communitySpread: 0,
      emotionalEnergy: 0,
      viralScore: 0,
      state: "monitor",
    },
  },
];

const MOCK_LEARNING: LearningUpdate = {
  learned: [
    "Challenger-tone posts outperform educational framing by 2.4x on X in this vertical.",
    "Posts published between 9:15–9:45 AM ET see 38% higher initial velocity.",
    "Single-stat hooks (e.g. '78% of marketers…') drive higher cascade depth than question hooks.",
  ],
  platformPreferenceChanges: [
    "X elevated from secondary to primary channel for this narrative type.",
    "Reddit engagement declining — moved from Tier 2 to Tier 3 for B2B SaaS content.",
  ],
  narrativePreferenceChanges: [
    "Provocateur narratives now score 18% higher than Authority for this audience segment.",
    "Long-form authority threads performing better on LinkedIn than short posts.",
  ],
  ctaThemeImprovements: [
    "'See why teams are switching' CTA outperforming 'Learn more' by 3.1x.",
    "ROI-focused themes converting 22% better than feature-focused themes.",
  ],
  nextExperiments: [
    "Test video-first challenger narrative on LinkedIn (hypothesis: 1.5x engagement vs text).",
    "A/B test urgency framing ('before Q3') vs evergreen framing on same audience segment.",
    "Trial Reddit AMA-style content with compressed brand context as authority play.",
  ],
};

// ── Sub-components ─────────────────────────────────────────────

const STATE_CONFIG: Record<CheckpointState, { label: string; icon: React.ReactNode; className: string; dotClass: string }> = {
  amplify: {
    label: "Amplify",
    icon: <ArrowUpRight className="w-3 h-3" />,
    className: "bg-green-500/10 text-green-400 border-green-500/30",
    dotClass: "bg-green-500",
  },
  monitor: {
    label: "Monitor",
    icon: <Pause className="w-3 h-3" />,
    className: "bg-amber-500/10 text-amber-400 border-amber-500/30",
    dotClass: "bg-amber-500",
  },
  archive: {
    label: "Archive",
    icon: <Archive className="w-3 h-3" />,
    className: "bg-muted text-muted-foreground border-border",
    dotClass: "bg-muted-foreground",
  },
};

function MetricCell({ label, value, icon, muted }: { label: string; value: string | number; icon: React.ReactNode; muted?: boolean }) {
  return (
    <div className={cn("flex items-center gap-2 py-1", muted && "opacity-30")}>
      <span className="text-muted-foreground shrink-0">{icon}</span>
      <span className="text-xs text-muted-foreground w-24 shrink-0">{label}</span>
      <span className="text-sm font-mono font-semibold text-foreground">{muted ? "—" : value}</span>
    </div>
  );
}

function CheckpointNode({ checkpoint, isLast, onSelect, isSelected }: { checkpoint: Checkpoint; isLast: boolean; onSelect: () => void; isSelected: boolean }) {
  const stateConfig = STATE_CONFIG[checkpoint.metrics.state];
  const isFuture = checkpoint.isFuture;

  return (
    <div className="flex gap-3">
      {/* Timeline spine */}
      <div className="flex flex-col items-center w-8 shrink-0">
        <button
          onClick={onSelect}
          className={cn(
            "w-3 h-3 rounded-full border-2 shrink-0 transition-all",
            checkpoint.isActive
              ? "border-primary bg-primary ring-4 ring-primary/20"
              : isFuture
                ? "border-border bg-background"
                : `border-transparent ${stateConfig.dotClass}`,
            !isFuture && "cursor-pointer hover:ring-2 hover:ring-primary/30"
          )}
        />
        {!isLast && (
          <div className={cn("w-px flex-1 min-h-[2rem]", isFuture ? "bg-border/40 border-dashed" : "bg-border")} />
        )}
      </div>

      {/* Checkpoint content */}
      <div className={cn("flex-1 pb-4 min-w-0", isFuture && "opacity-40")}>
        <div className="flex items-center gap-2 mb-1">
          <span className={cn("text-sm font-semibold", checkpoint.isActive ? "text-primary" : "text-foreground")}>
            {checkpoint.label}
          </span>
          {!isFuture && (
            <Badge variant="outline" className={cn("text-[10px] gap-1", stateConfig.className)}>
              {stateConfig.icon}
              {stateConfig.label}
            </Badge>
          )}
          {checkpoint.isActive && (
            <Badge className="text-[10px] bg-primary/20 text-primary border-primary/30 animate-pulse">LIVE</Badge>
          )}
          {isFuture && (
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Pending</span>
          )}
        </div>

        {/* Metrics grid — shown inline for selected or active, collapsed otherwise */}
        {(isSelected || checkpoint.isActive) && !isFuture && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 bg-card/80 border border-border rounded-lg p-3 mt-2">
            <MetricCell label="Engagement" value={checkpoint.metrics.engagementTotal.toLocaleString()} icon={<Activity className="w-3 h-3" />} />
            <MetricCell label="Velocity" value={`${checkpoint.metrics.velocity.toFixed(1)}/min`} icon={<TrendingUp className="w-3 h-3" />} />
            <MetricCell label="Acceleration" value={checkpoint.metrics.acceleration > 0 ? `+${checkpoint.metrics.acceleration.toFixed(1)}` : checkpoint.metrics.acceleration.toFixed(1)} icon={<Zap className="w-3 h-3" />} />
            <MetricCell label="Novelty" value={checkpoint.metrics.novelty} icon={<Lightbulb className="w-3 h-3" />} />
            <MetricCell label="Cascade Depth" value={checkpoint.metrics.cascadeDepth} icon={<ArrowRight className="w-3 h-3" />} />
            <MetricCell label="Community" value={checkpoint.metrics.communitySpread} icon={<Radio className="w-3 h-3" />} />
            <MetricCell label="Emotion" value={checkpoint.metrics.emotionalEnergy} icon={<Flame className="w-3 h-3" />} />
            <MetricCell label="Viral Score" value={checkpoint.metrics.viralScore} icon={<BarChart3 className="w-3 h-3" />} />
          </div>
        )}

        {/* Compact inline stats for non-selected past checkpoints */}
        {!isSelected && !checkpoint.isActive && !isFuture && (
          <div className="flex items-center gap-4 text-xs text-muted-foreground mt-0.5">
            <span className="font-mono">{checkpoint.metrics.engagementTotal.toLocaleString()} eng</span>
            <span className="font-mono">{checkpoint.metrics.velocity.toFixed(1)}/min</span>
            <span className="font-mono">viral {checkpoint.metrics.viralScore}</span>
          </div>
        )}
      </div>
    </div>
  );
}

function LearningSection({
  icon,
  label,
  items,
  accentClass,
}: {
  icon: React.ReactNode;
  label: string;
  items: string[];
  accentClass: string;
}) {
  const [open, setOpen] = useState(false);
  if (!items.length) return null;

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger className="flex items-center justify-between w-full py-2 px-3 rounded-md hover:bg-muted/50 transition-colors">
        <div className="flex items-center gap-2 text-sm font-medium text-foreground">
          {icon}
          {label}
          <Badge variant="secondary" className="text-[10px] ml-1">{items.length}</Badge>
        </div>
        <ChevronDown className={cn("w-3.5 h-3.5 text-muted-foreground transition-transform", open && "rotate-180")} />
      </CollapsibleTrigger>
      <CollapsibleContent className="pl-8 pr-3 pb-2 pt-1">
        <ul className="space-y-2">
          {items.map((item, i) => (
            <li key={i} className="text-sm text-muted-foreground leading-relaxed flex gap-2">
              <span className={cn("font-bold shrink-0", accentClass)}>→</span>
              {item}
            </li>
          ))}
        </ul>
      </CollapsibleContent>
    </Collapsible>
  );
}

// ── Main Component ─────────────────────────────────────────────

export default function CampaignPerformanceTimeline({
  checkpoints,
  learning,
  campaignTitle,
}: CampaignPerformanceTimelineProps) {
  const data = checkpoints || MOCK_CHECKPOINTS;
  const learningData = learning || MOCK_LEARNING;
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);

  const activeCheckpoint = data.find((c) => c.isActive);
  const completedCount = data.filter((c) => !c.isFuture).length;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Activity className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-bold text-foreground">
            {campaignTitle ? `Performance: ${campaignTitle}` : "Live Performance Timeline"}
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs font-mono">
            {completedCount}/{data.length} checkpoints
          </Badge>
          {activeCheckpoint && (
            <Badge className="text-xs bg-primary/15 text-primary border-primary/30 gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
              Live at {activeCheckpoint.label}
            </Badge>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
        {/* Timeline column */}
        <div className="lg:col-span-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground font-medium">2-Hour Decision Model</CardTitle>
            </CardHeader>
            <CardContent className="pt-2">
              {data.map((cp, idx) => (
                <CheckpointNode
                  key={cp.minutesMark}
                  checkpoint={cp}
                  isLast={idx === data.length - 1}
                  isSelected={selectedIdx === idx}
                  onSelect={() => setSelectedIdx(selectedIdx === idx ? null : idx)}
                />
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Learning panel column */}
        <div className="lg:col-span-2">
          <Card className="border-primary/20 bg-gradient-to-br from-card to-primary/[0.03]">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Brain className="w-4 h-4 text-primary" />
                Learning Updates
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-0.5 pt-0">
              <LearningSection
                icon={<Brain className="w-3.5 h-3.5 text-primary" />}
                label="What KLYC Learned"
                items={learningData.learned}
                accentClass="text-primary"
              />
              <LearningSection
                icon={<Radio className="w-3.5 h-3.5 text-amber-500" />}
                label="Platform Preference"
                items={learningData.platformPreferenceChanges}
                accentClass="text-amber-500"
              />
              <LearningSection
                icon={<Flame className="w-3.5 h-3.5 text-destructive" />}
                label="Narrative Preference"
                items={learningData.narrativePreferenceChanges}
                accentClass="text-destructive"
              />
              <LearningSection
                icon={<TrendingUp className="w-3.5 h-3.5 text-green-500" />}
                label="CTA & Theme Wins"
                items={learningData.ctaThemeImprovements}
                accentClass="text-green-500"
              />
              <LearningSection
                icon={<RefreshCw className="w-3.5 h-3.5 text-primary" />}
                label="Next Experiments"
                items={learningData.nextExperiments}
                accentClass="text-primary"
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
