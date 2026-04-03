import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Search, FileText, Image, Edit3, BarChart3, Send, ArrowRight } from "lucide-react";

interface SubmindNode {
  id: string;
  label: string;
  icon: any;
  description: string;
  color: string;
  connections: string[];
}

const SUBMINDS: SubmindNode[] = [
  { id: "research", label: "Research Submind", icon: Search, description: "Market trends, competitor analysis, audience insights", color: "bg-blue-500/10 border-blue-500/30", connections: ["content"] },
  { id: "content", label: "Content Submind", icon: FileText, description: "Generate captions, scripts, articles from brain context", color: "bg-purple-500/10 border-purple-500/30", connections: ["image", "editor"] },
  { id: "image", label: "Image Submind", icon: Image, description: "Generate visual prompts and image descriptions", color: "bg-pink-500/10 border-pink-500/30", connections: ["editor"] },
  { id: "editor", label: "Editor Submind", icon: Edit3, description: "Refine, fact-check, enforce brand voice compliance", color: "bg-orange-500/10 border-orange-500/30", connections: ["analytics"] },
  { id: "analytics", label: "Analytics Submind", icon: BarChart3, description: "Score content, predict engagement, optimize timing", color: "bg-green-500/10 border-green-500/30", connections: ["queue"] },
  { id: "queue", label: "Queue Worker", icon: Send, description: "Schedule, publish, retry failed posts across platforms", color: "bg-cyan-500/10 border-cyan-500/30", connections: [] },
];

export default function OrchestratorGraph() {
  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Klyc Reasoning Graph</h1>
        <p className="text-muted-foreground text-sm">Visual map of the submind pipeline</p>
      </div>

      {/* Flow diagram */}
      <Card>
        <CardHeader><CardTitle className="text-lg">Pipeline Flow</CardTitle></CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center gap-2 justify-center">
            {SUBMINDS.map((submind, i) => (
              <div key={submind.id} className="flex items-center gap-2">
                <div className={`rounded-lg border p-3 ${submind.color} min-w-[120px] text-center`}>
                  <submind.icon className="h-5 w-5 mx-auto mb-1" />
                  <p className="text-xs font-medium">{submind.label}</p>
                </div>
                {i < SUBMINDS.length - 1 && <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Submind detail cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {SUBMINDS.map(submind => (
          <Card key={submind.id} className={`border ${submind.color}`}>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <submind.icon className="h-5 w-5" />
                {submind.label}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-3">{submind.description}</p>
              {submind.connections.length > 0 && (
                <div className="flex gap-1 flex-wrap">
                  <span className="text-xs text-muted-foreground">Outputs to:</span>
                  {submind.connections.map(c => {
                    const target = SUBMINDS.find(a => a.id === c);
                    return <Badge key={c} variant="outline" className="text-xs">{target?.label}</Badge>;
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Connection matrix */}
      <Card>
        <CardHeader><CardTitle className="text-lg">Connection Matrix</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr>
                  <th className="p-2 text-left">From ↓ / To →</th>
                  {AGENTS.map(a => <th key={a.id} className="p-2 text-center">{a.label.split(" ")[0]}</th>)}
                </tr>
              </thead>
              <tbody>
                {AGENTS.map(from => (
                  <tr key={from.id} className="border-t border-border">
                    <td className="p-2 font-medium">{from.label}</td>
                    {AGENTS.map(to => (
                      <td key={to.id} className="p-2 text-center">
                        {from.connections.includes(to.id) ? (
                          <span className="inline-block w-3 h-3 rounded-full bg-primary" />
                        ) : (
                          <span className="inline-block w-3 h-3 rounded-full bg-muted" />
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
