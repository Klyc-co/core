import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, ArrowRight, CheckCircle2, XCircle } from "lucide-react";

export interface PlatformBattle {
  scores: Record<string, number>;
  bestFirst: string;
  customerRequested: string[];
  systemRecommended: string[];
}

const MOCK_BATTLE: PlatformBattle = {
  scores: { LinkedIn: 88, X: 76, Reddit: 72, YouTube: 65 },
  bestFirst: "LinkedIn",
  customerRequested: ["LinkedIn", "Instagram"],
  systemRecommended: ["LinkedIn", "X", "Reddit"],
};

function PlatformRow({ name, score, isBest }: { name: string; score: number; isBest: boolean }) {
  const color = score >= 80 ? "bg-green-500" : score >= 65 ? "bg-amber-500" : "bg-muted-foreground/40";
  return (
    <div className="flex items-center gap-3">
      <span className="text-sm font-medium text-foreground w-20 shrink-0">{name}</span>
      <div className="flex-1 h-3 rounded-full bg-muted overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${score}%` }} />
      </div>
      <span className="text-sm font-mono font-bold text-foreground w-8 text-right">{score}</span>
      {isBest && <Trophy className="w-4 h-4 text-amber-500 shrink-0" />}
    </div>
  );
}

export default function PlatformBattleView({ data }: { data?: PlatformBattle }) {
  const battle = data || MOCK_BATTLE;
  const sorted = Object.entries(battle.scores).sort(([, a], [, b]) => b - a);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Trophy className="w-4 h-4 text-amber-500" />
          Platform Battle View
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="space-y-2.5">
          {sorted.map(([name, score]) => (
            <PlatformRow key={name} name={name} score={score} isBest={name === battle.bestFirst} />
          ))}
        </div>

        <div className="border-t border-border pt-4">
          <div className="flex items-center gap-2 mb-3">
            <Badge className="text-xs">Best-First</Badge>
            <ArrowRight className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-sm font-semibold text-primary">{battle.bestFirst}</span>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wider">Customer Requested</div>
              <div className="space-y-1.5">
                {battle.customerRequested.map((p) => (
                  <div key={p} className="flex items-center gap-1.5 text-sm text-foreground">
                    <CheckCircle2 className="w-3.5 h-3.5 text-primary" />
                    {p}
                  </div>
                ))}
              </div>
            </div>
            <div>
              <div className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wider">System Recommended</div>
              <div className="space-y-1.5">
                {battle.systemRecommended.map((p) => {
                  const isNew = !battle.customerRequested.includes(p);
                  return (
                    <div key={p} className="flex items-center gap-1.5 text-sm text-foreground">
                      {isNew ? <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-primary border-primary/30">NEW</Badge> : <CheckCircle2 className="w-3.5 h-3.5 text-muted-foreground" />}
                      {p}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
