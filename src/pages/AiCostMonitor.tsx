import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { getUsageHistory, listModelPricing, estimateTokenCost } from "@/lib/agents/tokenMonitor";
import type { TokenUsageRecord, ModelPricing } from "@/lib/agents/tokenMonitor";
import { DollarSign, Cpu, BarChart3, RefreshCw } from "lucide-react";

export default function AiCostMonitor() {
  const [history, setHistory] = useState<TokenUsageRecord[]>(getUsageHistory());
  const models = listModelPricing();

  const refresh = () => setHistory(getUsageHistory());

  const totalEstCost = history.reduce((s, r) => s + r.estimatedCostUsd, 0);
  const totalActualCost = history.reduce((s, r) => s + (r.actualCostUsd || 0), 0);
  const totalTokens = history.reduce((s, r) => s + (r.actualTokens || r.estimatedTokens), 0);
  const totalPosts = history.reduce((s, r) => s + r.postCount, 0);

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">AI Token Cost Monitor</h1>
          <p className="text-muted-foreground text-sm">Track AI token usage and estimated costs</p>
        </div>
        <Button variant="outline" onClick={refresh}><RefreshCw className="h-4 w-4 mr-2" /> Refresh</Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4 flex items-center gap-3">
            <Cpu className="h-5 w-5 text-primary" />
            <div>
              <p className="text-2xl font-bold">{totalTokens.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">Total Tokens Used</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 flex items-center gap-3">
            <BarChart3 className="h-5 w-5 text-primary" />
            <div>
              <p className="text-2xl font-bold">{totalPosts > 0 ? Math.round(totalTokens / totalPosts).toLocaleString() : 0}</p>
              <p className="text-xs text-muted-foreground">Tokens per Post</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 flex items-center gap-3">
            <DollarSign className="h-5 w-5 text-green-500" />
            <div>
              <p className="text-2xl font-bold">${totalEstCost.toFixed(4)}</p>
              <p className="text-xs text-muted-foreground">Estimated Cost</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 flex items-center gap-3">
            <DollarSign className="h-5 w-5 text-yellow-500" />
            <div>
              <p className="text-2xl font-bold">${totalActualCost.toFixed(4)}</p>
              <p className="text-xs text-muted-foreground">Actual Cost</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-lg">Model Pricing</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Model</TableHead>
                <TableHead>Input / 1K tokens</TableHead>
                <TableHead>Output / 1K tokens</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {models.map(m => (
                <TableRow key={m.modelId}>
                  <TableCell className="font-mono text-sm">{m.modelId}</TableCell>
                  <TableCell>${m.inputPer1K.toFixed(5)}</TableCell>
                  <TableCell>${m.outputPer1K.toFixed(4)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-lg">Usage History ({history.length} records)</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Run ID</TableHead>
                <TableHead>Model</TableHead>
                <TableHead>Posts</TableHead>
                <TableHead>Est. Tokens</TableHead>
                <TableHead>Actual Tokens</TableHead>
                <TableHead>Est. Cost</TableHead>
                <TableHead>Timestamp</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {history.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No usage recorded yet. Run a campaign pipeline to generate data.</TableCell></TableRow>
              ) : history.map((r, i) => (
                <TableRow key={i}>
                  <TableCell className="font-mono text-xs">{r.runId.slice(0, 8)}</TableCell>
                  <TableCell className="font-mono text-xs">{r.model}</TableCell>
                  <TableCell>{r.postCount}</TableCell>
                  <TableCell>{r.estimatedTokens.toLocaleString()}</TableCell>
                  <TableCell>{r.actualTokens?.toLocaleString() || "—"}</TableCell>
                  <TableCell>${r.estimatedCostUsd.toFixed(4)}</TableCell>
                  <TableCell className="text-xs">{new Date(r.timestamp).toLocaleString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
