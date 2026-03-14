import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Dna, FileJson, RotateCcw, CheckCircle2, Loader2, ChevronDown, Globe, Package, Shield, Target, FileText } from "lucide-react";
import { useState } from "react";

export interface CompressionState {
  customerDnaLoaded: boolean;
  customerDnaSummary: string | null;
  strategyProfileLoaded: boolean;
  strategyProfileName: string | null;
  lastRunAt: string | null;
  /** Preloaded context summaries – hidden from raw view but shown as status */
  websiteSummary: string | null;
  productSummary: string | null;
  regulatorySummary: string | null;
  competitorSummary: string | null;
  priorCampaignSummary: string | null;
}

interface Props {
  state: CompressionState;
  onLoadDna: () => void;
  onLoadStrategy: () => void;
  onRerun: () => void;
  isLoading: boolean;
}

const ContextSlot = ({ icon, label, value }: { icon: React.ReactNode; label: string; value: string | null }) => {
  const [open, setOpen] = useState(false);
  const loaded = Boolean(value);

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <div className="flex items-center justify-between rounded-md border border-border/40 bg-background/50 px-3 py-2">
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">{icon}</span>
          <span className="text-xs font-medium text-foreground">{label}</span>
        </div>
        <div className="flex items-center gap-1.5">
          {loaded ? (
            <Badge variant="outline" className="text-[10px] h-5 bg-primary/5 text-primary border-primary/20">Loaded</Badge>
          ) : (
            <Badge variant="outline" className="text-[10px] h-5 text-muted-foreground">Empty</Badge>
          )}
          {loaded && (
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                <ChevronDown className={`w-3 h-3 transition-transform ${open ? "rotate-180" : ""}`} />
              </Button>
            </CollapsibleTrigger>
          )}
        </div>
      </div>
      {loaded && (
        <CollapsibleContent>
          <p className="text-[11px] text-muted-foreground leading-relaxed px-3 py-2 bg-muted/30 rounded-b-md border border-t-0 border-border/40 max-h-24 overflow-auto">
            {value}
          </p>
        </CollapsibleContent>
      )}
    </Collapsible>
  );
};

export default function CompressionStatePanel({ state, onLoadDna, onLoadStrategy, onRerun, isLoading }: Props) {
  return (
    <Card className="border-border/60 bg-card/80 backdrop-blur-sm">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-base font-semibold">
          <Dna className="w-4 h-4 text-primary" />
          State & Compression
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2.5">
        {/* Primary loaders */}
        <div className="flex items-center justify-between rounded-md border border-border/40 bg-background/50 px-3 py-2.5">
          <div className="flex items-center gap-2">
            <Dna className="w-3.5 h-3.5 text-muted-foreground" />
            <div>
              <span className="text-xs font-medium text-foreground">Customer DNA</span>
              {state.customerDnaLoaded && state.customerDnaSummary && (
                <p className="text-[10px] text-muted-foreground leading-snug max-w-[200px] truncate">{state.customerDnaSummary}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {state.customerDnaLoaded && <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />}
            <Button variant="ghost" size="sm" className="text-xs h-7 px-2" onClick={onLoadDna} disabled={isLoading}>
              {state.customerDnaLoaded ? "Reload" : "Load"}
            </Button>
          </div>
        </div>

        <div className="flex items-center justify-between rounded-md border border-border/40 bg-background/50 px-3 py-2.5">
          <div className="flex items-center gap-2">
            <FileJson className="w-3.5 h-3.5 text-muted-foreground" />
            <div>
              <span className="text-xs font-medium text-foreground">Strategy Profile</span>
              {state.strategyProfileLoaded && state.strategyProfileName && (
                <p className="text-[10px] text-muted-foreground">{state.strategyProfileName}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {state.strategyProfileLoaded && <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />}
            <Button variant="ghost" size="sm" className="text-xs h-7 px-2" onClick={onLoadStrategy} disabled={isLoading}>
              {state.strategyProfileLoaded ? "Reload" : "Load"}
            </Button>
          </div>
        </div>

        {/* Preloaded context slots – expandable */}
        <div className="space-y-1.5 pt-1">
          <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider px-1">Preloaded Context</p>
          <ContextSlot icon={<Globe className="w-3 h-3" />} label="Website" value={state.websiteSummary} />
          <ContextSlot icon={<Package className="w-3 h-3" />} label="Product" value={state.productSummary} />
          <ContextSlot icon={<Shield className="w-3 h-3" />} label="Regulatory" value={state.regulatorySummary} />
          <ContextSlot icon={<Target className="w-3 h-3" />} label="Competitor" value={state.competitorSummary} />
          <ContextSlot icon={<FileText className="w-3 h-3" />} label="Prior Campaign" value={state.priorCampaignSummary} />
        </div>

        {/* Re-run */}
        <Button
          variant="outline"
          size="sm"
          className="w-full gap-2 text-xs border-primary/30 text-primary hover:bg-primary/5"
          onClick={onRerun}
          disabled={isLoading}
        >
          {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5" />}
          {isLoading ? "Processing..." : "Re-run Analysis"}
        </Button>

        {state.lastRunAt && (
          <p className="text-[10px] text-muted-foreground text-center">
            Last run: {new Date(state.lastRunAt).toLocaleString()}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
