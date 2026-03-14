import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, Brain, MessageSquare, Lightbulb, AlertTriangle, QrCode } from "lucide-react";
import { useState } from "react";

export interface StrategyReasoning {
  whyThisApproach: string;
  customerRequested: string;
  systemRecommendation: string;
  reactiveOpportunities: string[];
  proactiveOpportunities: string[];
  qrRoutingNotes: string[];
}

const MOCK_REASONING: StrategyReasoning = {
  whyThisApproach: "The challenger narrative was selected because the customer's market positioning requires disruption framing. Competitor reliance on fragmented toolchains creates a natural attack vector. The customer's proof points (3x engagement lift) provide the evidence base needed to support aggressive claims without losing credibility.",
  customerRequested: "Brand awareness campaign across LinkedIn and Instagram targeting mid-market SaaS buyers with educational content about AI marketing automation.",
  systemRecommendation: "Shift primary channel from Instagram to X + Reddit. Educational framing should be replaced with provocative challenger positioning. Add LinkedIn as authority channel. Instagram deprioritized due to low B2B SaaS engagement in this vertical.",
  reactiveOpportunities: [
    "Jasper announced pricing increase — timing window for competitive switch messaging",
    "HubSpot Content Hub received negative reviews on G2 this week — opportunity for contrast positioning",
  ],
  proactiveOpportunities: [
    "AI marketing regulation discussion trending on LinkedIn — position as compliant-first platform",
    "Q2 marketing budget planning season — create ROI calculator content series",
    "Launch 'Brand Memory' concept as new category before competitors adopt the language",
  ],
  qrRoutingNotes: [
    "QR codes on event collateral should route to personalized landing pages with pre-filled brand context",
    "WhatsApp conversation routing recommended for enterprise prospects (higher close rate than email)",
    "Consider QR-to-demo flow for trade show materials with compressed brand context pre-loaded",
  ],
};

interface ReasoningSectionProps {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  badge?: string;
}

function ReasoningSection({ icon, label, children, defaultOpen = false, badge }: ReasoningSectionProps) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger className="flex items-center justify-between w-full py-2.5 px-3 rounded-md hover:bg-muted/50 transition-colors">
        <div className="flex items-center gap-2 text-sm font-medium text-foreground">
          {icon}
          {label}
          {badge && <Badge variant="secondary" className="text-[10px] ml-1">{badge}</Badge>}
        </div>
        <ChevronDown className={`w-3.5 h-3.5 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
      </CollapsibleTrigger>
      <CollapsibleContent className="pl-8 pr-3 pb-3 pt-1">
        {children}
      </CollapsibleContent>
    </Collapsible>
  );
}

export default function StrategyReasoningPanel({ data }: { data?: StrategyReasoning }) {
  const reasoning = data || MOCK_REASONING;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Brain className="w-4 h-4 text-primary" />
          Strategy Reasoning
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-0.5 pt-0">
        <ReasoningSection icon={<Brain className="w-3.5 h-3.5 text-primary" />} label="Why This Approach" defaultOpen>
          <p className="text-sm text-muted-foreground leading-relaxed">{reasoning.whyThisApproach}</p>
        </ReasoningSection>

        <ReasoningSection icon={<MessageSquare className="w-3.5 h-3.5 text-muted-foreground" />} label="Customer Requested">
          <p className="text-sm text-muted-foreground leading-relaxed">{reasoning.customerRequested}</p>
        </ReasoningSection>

        <ReasoningSection icon={<Lightbulb className="w-3.5 h-3.5 text-amber-500" />} label="System Recommendation">
          <p className="text-sm text-muted-foreground leading-relaxed">{reasoning.systemRecommendation}</p>
        </ReasoningSection>

        <ReasoningSection icon={<AlertTriangle className="w-3.5 h-3.5 text-destructive" />} label="Reactive Opportunities" badge={`${reasoning.reactiveOpportunities.length}`}>
          <ul className="space-y-2">
            {reasoning.reactiveOpportunities.map((opp, i) => (
              <li key={i} className="text-sm text-muted-foreground leading-relaxed flex gap-2">
                <span className="text-destructive font-bold shrink-0">→</span>
                {opp}
              </li>
            ))}
          </ul>
        </ReasoningSection>

        <ReasoningSection icon={<Lightbulb className="w-3.5 h-3.5 text-green-500" />} label="Proactive Opportunities" badge={`${reasoning.proactiveOpportunities.length}`}>
          <ul className="space-y-2">
            {reasoning.proactiveOpportunities.map((opp, i) => (
              <li key={i} className="text-sm text-muted-foreground leading-relaxed flex gap-2">
                <span className="text-green-500 font-bold shrink-0">→</span>
                {opp}
              </li>
            ))}
          </ul>
        </ReasoningSection>

        <ReasoningSection icon={<QrCode className="w-3.5 h-3.5 text-primary" />} label="QR / Conversation Routing">
          <ul className="space-y-2">
            {reasoning.qrRoutingNotes.map((note, i) => (
              <li key={i} className="text-sm text-muted-foreground leading-relaxed flex gap-2">
                <span className="text-primary font-bold shrink-0">•</span>
                {note}
              </li>
            ))}
          </ul>
        </ReasoningSection>
      </CardContent>
    </Card>
  );
}
