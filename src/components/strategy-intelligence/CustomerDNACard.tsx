import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, Dna, Shield, Target, Users, AlertTriangle, Eye, Sparkles, FileText } from "lucide-react";
import { useState } from "react";

export interface CustomerDNA {
  brandVoice: string;
  audienceSegments: string[];
  painPoints: string[];
  proofPoints: string[];
  regulations: string[];
  competitors: string[];
  semanticThemes: string[];
  trustSignals: string[];
  compressedSourceCount: number;
}

const MOCK_DNA: CustomerDNA = {
  brandVoice: "Confident, precise, slightly irreverent. Avoids jargon. Leads with outcomes, not features.",
  audienceSegments: ["Mid-market SaaS buyers", "Marketing directors (50–200 headcount)", "Solo consultants scaling past $500k"],
  painPoints: ["Content inconsistency across platforms", "No unified brand memory", "Manual campaign planning bottleneck"],
  proofPoints: ["3x engagement lift in pilot", "78% approval rate on first draft", "40% reduction in planning time"],
  regulations: ["GDPR email consent", "FTC disclosure on sponsored content", "CCPA opt-out compliance"],
  competitors: ["Jasper", "Copy.ai", "HubSpot Content Hub", "Sprout Social"],
  semanticThemes: ["AI-native marketing", "brand consistency", "autonomous campaigns", "compression intelligence"],
  trustSignals: ["SOC 2 compliant", "No data sharing with third parties", "Enterprise-grade encryption"],
  compressedSourceCount: 147,
};

interface ExpandableSectionProps {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

function ExpandableSection({ icon, label, children, defaultOpen = false }: ExpandableSectionProps) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger className="flex items-center justify-between w-full py-2 px-3 rounded-md hover:bg-muted/50 transition-colors group">
        <div className="flex items-center gap-2 text-sm font-medium text-foreground">
          {icon}
          {label}
        </div>
        <ChevronDown className={`w-3.5 h-3.5 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
      </CollapsibleTrigger>
      <CollapsibleContent className="pl-8 pr-3 pb-2 pt-1">
        {children}
      </CollapsibleContent>
    </Collapsible>
  );
}

function TagList({ items, variant = "secondary" }: { items: string[]; variant?: "secondary" | "outline" | "destructive" }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((item) => (
        <Badge key={item} variant={variant} className="text-xs font-normal">{item}</Badge>
      ))}
    </div>
  );
}

export default function CustomerDNACard({ data }: { data?: CustomerDNA }) {
  const dna = data || MOCK_DNA;

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-card to-primary/[0.03]">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Dna className="w-4 h-4 text-primary" />
            Customer DNA Summary
          </CardTitle>
          <Badge variant="outline" className="text-xs font-mono">
            <FileText className="w-3 h-3 mr-1" />
            {dna.compressedSourceCount} sources
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-0.5 pt-0">
        <ExpandableSection icon={<Sparkles className="w-3.5 h-3.5 text-primary" />} label="Brand Voice" defaultOpen>
          <p className="text-sm text-muted-foreground leading-relaxed">{dna.brandVoice}</p>
        </ExpandableSection>

        <ExpandableSection icon={<Users className="w-3.5 h-3.5 text-primary" />} label="Audience Segments">
          <TagList items={dna.audienceSegments} />
        </ExpandableSection>

        <ExpandableSection icon={<AlertTriangle className="w-3.5 h-3.5 text-destructive" />} label="Pain Points">
          <TagList items={dna.painPoints} variant="outline" />
        </ExpandableSection>

        <ExpandableSection icon={<Shield className="w-3.5 h-3.5 text-primary" />} label="Proof Points">
          <TagList items={dna.proofPoints} />
        </ExpandableSection>

        <ExpandableSection icon={<AlertTriangle className="w-3.5 h-3.5 text-muted-foreground" />} label="Regulations">
          <TagList items={dna.regulations} variant="destructive" />
        </ExpandableSection>

        <ExpandableSection icon={<Target className="w-3.5 h-3.5 text-primary" />} label="Competitors">
          <TagList items={dna.competitors} variant="outline" />
        </ExpandableSection>

        <ExpandableSection icon={<Eye className="w-3.5 h-3.5 text-primary" />} label="Semantic Themes">
          <TagList items={dna.semanticThemes} />
        </ExpandableSection>

        <ExpandableSection icon={<Shield className="w-3.5 h-3.5 text-green-500" />} label="Trust Signals">
          <TagList items={dna.trustSignals} />
        </ExpandableSection>
      </CardContent>
    </Card>
  );
}
