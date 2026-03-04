import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { runCampaignPipeline } from "@/lib/agents/orchestrator";
import type { PipelineResult, PipelineStage } from "@/lib/agents/orchestrator";
import { Play, Loader2, CheckCircle2, XCircle, Clock, AlertTriangle } from "lucide-react";

const STAGES: { key: PipelineStage; label: string }[] = [
  { key: "load_draft", label: "Load Draft" },
  { key: "load_brain", label: "Load Client Brain" },
  { key: "plan", label: "Plan Campaign" },
  { key: "generate", label: "Generate Content" },
  { key: "save_posts", label: "Save Posts" },
  { key: "schedule", label: "Schedule Posts" },
  { key: "complete", label: "Approval Check / Publish Queue" },
];

const stageOrder = STAGES.map(s => s.key);

function getStageStatus(stage: PipelineStage, completedStage: PipelineStage, hasError: boolean) {
  const completedIdx = stageOrder.indexOf(completedStage);
  const currentIdx = stageOrder.indexOf(stage);
  if (hasError && currentIdx === completedIdx) return "error";
  if (currentIdx < completedIdx) return "done";
  if (currentIdx === completedIdx && !hasError) return "done";
  return "pending";
}

export default function OrchestratorPanel() {
  const [draftId, setDraftId] = useState("");
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<PipelineResult | null>(null);

  const handleRun = async () => {
    if (!draftId.trim()) {
      toast.error("Enter a campaign draft ID");
      return;
    }
    setRunning(true);
    setResult(null);
    try {
      const r = await runCampaignPipeline(draftId.trim());
      setResult(r);
      if (r.success) {
        toast.success(`Pipeline completed: ${r.post_queue_ids.length} posts created`);
      } else {
        toast.error(`Pipeline failed at ${r.stage_completed}: ${r.error}`);
      }
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Orchestrator Control Panel</h1>
        <p className="text-muted-foreground text-sm">Monitor and control the campaign pipeline</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Run Pipeline</CardTitle>
        </CardHeader>
        <CardContent className="flex gap-3">
          <Input
            placeholder="Campaign Draft ID"
            value={draftId}
            onChange={(e) => setDraftId(e.target.value)}
            className="max-w-md"
          />
          <Button onClick={handleRun} disabled={running}>
            {running ? <Loader2 className="animate-spin mr-2" /> : <Play className="mr-2" />}
            Run Pipeline
          </Button>
        </CardContent>
      </Card>

      {result && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="pt-4">
                <p className="text-xs text-muted-foreground">Draft ID</p>
                <p className="text-sm font-mono truncate">{result.draft_id}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <p className="text-xs text-muted-foreground">Client ID</p>
                <p className="text-sm font-mono truncate">{result.client_id}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <p className="text-xs text-muted-foreground">Execution Time</p>
                <p className="text-sm font-mono">
                  {result.completed_at && result.started_at
                    ? `${((new Date(result.completed_at).getTime() - new Date(result.started_at).getTime()) / 1000).toFixed(1)}s`
                    : "—"}
                </p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Pipeline Stages</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Stage</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {STAGES.map(s => {
                    const status = getStageStatus(s.key, result.stage_completed, !result.success);
                    return (
                      <TableRow key={s.key}>
                        <TableCell className="font-medium">{s.label}</TableCell>
                        <TableCell>
                          {status === "done" && <Badge variant="default" className="bg-green-600"><CheckCircle2 className="h-3 w-3 mr-1" /> Done</Badge>}
                          {status === "error" && <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" /> Error</Badge>}
                          {status === "pending" && <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" /> Pending</Badge>}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {result.warnings.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2"><AlertTriangle className="h-5 w-5 text-yellow-500" /> Warnings</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="list-disc pl-5 space-y-1 text-sm text-muted-foreground">
                  {result.warnings.map((w, i) => <li key={i}>{w}</li>)}
                </ul>
              </CardContent>
            </Card>
          )}

          {result.error && (
            <Card className="border-destructive">
              <CardContent className="pt-4">
                <p className="text-sm text-destructive font-mono">{result.error}</p>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
