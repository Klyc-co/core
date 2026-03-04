import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { RefreshCw, CheckCircle2, XCircle, Clock, AlertTriangle, Skull } from "lucide-react";

interface PlatformTarget {
  id: string;
  platform: string;
  status: string;
  platform_post_id: string | null;
  error_message: string | null;
  published_at: string | null;
  created_at: string;
  post_queue_id: string;
}

const STATUS_MAP: Record<string, { icon: any; variant: string; label: string }> = {
  pending: { icon: Clock, variant: "secondary", label: "Scheduled" },
  published: { icon: CheckCircle2, variant: "default", label: "Published" },
  failed: { icon: XCircle, variant: "destructive", label: "Failed" },
  dead_letter: { icon: Skull, variant: "outline", label: "Dead Letter" },
};

export default function PublishStatusDashboard() {
  const [targets, setTargets] = useState<PlatformTarget[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("post_platform_targets")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);
    setTargets((data as PlatformTarget[]) || []);
    setLoading(false);
  };

  useEffect(() => { fetch(); }, []);

  const counts = targets.reduce((acc, t) => {
    acc[t.status] = (acc[t.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Publish Status Dashboard</h1>
          <p className="text-muted-foreground text-sm">Platform-level publishing status for all posts</p>
        </div>
        <Button variant="outline" onClick={fetch}><RefreshCw className="h-4 w-4 mr-2" /> Refresh</Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Object.entries(STATUS_MAP).map(([key, { icon: Icon, label }]) => (
          <Card key={key}>
            <CardContent className="pt-4 flex items-center gap-3">
              <Icon className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-2xl font-bold">{counts[key] || 0}</p>
                <p className="text-xs text-muted-foreground">{label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Platform</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Post Queue ID</TableHead>
                <TableHead>Platform Post ID</TableHead>
                <TableHead>Published At</TableHead>
                <TableHead>Error</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Loading…</TableCell></TableRow>
              ) : targets.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No publish targets</TableCell></TableRow>
              ) : targets.map(t => {
                const s = STATUS_MAP[t.status] || STATUS_MAP.pending;
                return (
                  <TableRow key={t.id}>
                    <TableCell className="capitalize font-medium">{t.platform}</TableCell>
                    <TableCell><Badge variant={s.variant as any}>{s.label}</Badge></TableCell>
                    <TableCell className="font-mono text-xs">{t.post_queue_id.slice(0, 8)}</TableCell>
                    <TableCell className="font-mono text-xs">{t.platform_post_id || "—"}</TableCell>
                    <TableCell className="text-xs">{t.published_at ? new Date(t.published_at).toLocaleString() : "—"}</TableCell>
                    <TableCell className="text-xs text-destructive max-w-[200px] truncate">{t.error_message || "—"}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
