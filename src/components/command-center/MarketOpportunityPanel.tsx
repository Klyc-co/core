import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BarChart3, Users, Send, MonitorSpeaker, Globe, Flame } from "lucide-react";

export interface MarketOpportunity {
  addressableMarketSize: string;
  reachableAudience: string;
  recommendedOutbounds: number;
  estimatedAccounts: number;
  platformRankings: { platform: string; score: number; reason: string }[];
  pressureMap: { factor: string; intensity: "low" | "medium" | "high"; note: string }[];
}

interface Props {
  data: MarketOpportunity | null;
}

const intensityColor = {
  low: "bg-green-500/15 text-green-600 border-green-500/30",
  medium: "bg-amber-500/15 text-amber-600 border-amber-500/30",
  high: "bg-red-500/15 text-red-600 border-red-500/30",
};

export default function MarketOpportunityPanel({ data }: Props) {
  if (!data) {
    return (
      <Card className="border-border/60 bg-card/80 backdrop-blur-sm">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-base font-semibold">
            <BarChart3 className="w-4 h-4 text-primary" />
            Market Opportunity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-32 text-sm text-muted-foreground">
            Awaiting signal data to compute market opportunity
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/60 bg-card/80 backdrop-blur-sm">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-base font-semibold">
          <BarChart3 className="w-4 h-4 text-primary" />
          Market Opportunity Summary
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Key Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <MetricCard icon={<Globe className="w-4 h-4" />} label="Addressable Market" value={data.addressableMarketSize} />
          <MetricCard icon={<Users className="w-4 h-4" />} label="Reachable Audience" value={data.reachableAudience} />
          <MetricCard icon={<Send className="w-4 h-4" />} label="Recommended Posts" value={data.recommendedOutbounds.toLocaleString()} />
          <MetricCard icon={<MonitorSpeaker className="w-4 h-4" />} label="Accounts Needed" value={data.estimatedAccounts.toLocaleString()} />
        </div>

        {/* Platform Rankings */}
        <div className="space-y-2">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Platform Rankings</h4>
          <div className="space-y-1.5">
            {data.platformRankings.map((p, i) => (
              <div key={p.platform} className="flex items-center gap-3 rounded-md border border-border/40 bg-background/50 px-3 py-2">
                <span className="text-xs font-mono text-muted-foreground w-5">#{i + 1}</span>
                <span className="text-sm font-medium text-foreground flex-1">{p.platform}</span>
                <div className="w-24 h-1.5 rounded-full bg-muted overflow-hidden">
                  <div className="h-full rounded-full bg-primary" style={{ width: `${p.score}%` }} />
                </div>
                <span className="text-[10px] font-mono text-muted-foreground w-8 text-right">{p.score}%</span>
              </div>
            ))}
          </div>
        </div>

        {/* Pressure Map */}
        <div className="space-y-2">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
            <Flame className="w-3 h-3" /> Strategic Pressure Map
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {data.pressureMap.map((p) => (
              <div key={p.factor} className="flex items-start gap-2 rounded-md border border-border/40 bg-background/50 px-3 py-2">
                <Badge variant="outline" className={`text-[9px] mt-0.5 shrink-0 ${intensityColor[p.intensity]}`}>
                  {p.intensity}
                </Badge>
                <div>
                  <span className="text-xs font-medium text-foreground">{p.factor}</span>
                  <p className="text-[11px] text-muted-foreground leading-snug">{p.note}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function MetricCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border/40 bg-background/50 p-3 space-y-1">
      <div className="flex items-center gap-1.5 text-muted-foreground">{icon}<span className="text-[10px] uppercase tracking-wider">{label}</span></div>
      <p className="text-lg font-semibold text-foreground font-mono">{value}</p>
    </div>
  );
}
