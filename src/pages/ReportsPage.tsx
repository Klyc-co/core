import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RefreshCw, Download, FileText, Calendar } from "lucide-react";
import { toast } from "sonner";

export default function ReportsPage() {
  const [results, setResults] = useState<any[]>([]);
  const [scheduled, setScheduled] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = async () => {
    setLoading(true);
    const [r1, r2] = await Promise.all([
      supabase.from("report_results").select("*").order("generated_at", { ascending: false }).limit(100),
      supabase.from("scheduled_reports").select("*").order("created_at", { ascending: false }).limit(50),
    ]);
    setResults(r1.data || []);
    setScheduled(r2.data || []);
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, []);

  const downloadCSV = (report: any) => {
    const rows = [
      ["Search Term", "Sentiment", "Mentions", "Sources", "Positive %", "Neutral %", "Negative %", "Generated At"],
      [report.search_term, report.sentiment, report.mentions, report.sources, report.positive_percent, report.neutral_percent, report.negative_percent, report.generated_at],
    ];
    const csv = rows.map(r => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `report-${report.search_term}.csv`; a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV downloaded");
  };

  const downloadPDF = (report: any) => {
    // Simple text-based PDF-like download
    const content = `Report: ${report.search_term}\nSentiment: ${report.sentiment}\nMentions: ${report.mentions}\nSources: ${report.sources}\nPositive: ${report.positive_percent}%\nNeutral: ${report.neutral_percent}%\nNegative: ${report.negative_percent}%\nSummary: ${report.summary || "N/A"}\nGenerated: ${report.generated_at}`;
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `report-${report.search_term}.txt`; a.click();
    URL.revokeObjectURL(url);
    toast.success("Report downloaded");
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Reports</h1>
          <p className="text-muted-foreground text-sm">View and download generated reports</p>
        </div>
        <Button variant="outline" onClick={fetchAll}><RefreshCw className="h-4 w-4 mr-2" /> Refresh</Button>
      </div>

      <Tabs defaultValue="results">
        <TabsList>
          <TabsTrigger value="results"><FileText className="h-4 w-4 mr-1" /> Results ({results.length})</TabsTrigger>
          <TabsTrigger value="scheduled"><Calendar className="h-4 w-4 mr-1" /> Scheduled ({scheduled.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="results" className="mt-4">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Search Term</TableHead>
                    <TableHead>Sentiment</TableHead>
                    <TableHead>Mentions</TableHead>
                    <TableHead>Sources</TableHead>
                    <TableHead>Positive</TableHead>
                    <TableHead>Neutral</TableHead>
                    <TableHead>Negative</TableHead>
                    <TableHead>Generated</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">Loading…</TableCell></TableRow>
                  : results.length === 0 ? <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">No reports</TableCell></TableRow>
                  : results.map(r => (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium">{r.search_term}</TableCell>
                      <TableCell><Badge variant="secondary">{r.sentiment}</Badge></TableCell>
                      <TableCell>{r.mentions}</TableCell>
                      <TableCell>{r.sources}</TableCell>
                      <TableCell className="text-green-600">{r.positive_percent}%</TableCell>
                      <TableCell>{r.neutral_percent}%</TableCell>
                      <TableCell className="text-red-500">{r.negative_percent}%</TableCell>
                      <TableCell className="text-xs">{new Date(r.generated_at).toLocaleString()}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button size="sm" variant="ghost" onClick={() => downloadCSV(r)}><Download className="h-3 w-3 mr-1" /> CSV</Button>
                          <Button size="sm" variant="ghost" onClick={() => downloadPDF(r)}><Download className="h-3 w-3 mr-1" /> PDF</Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="scheduled" className="mt-4">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Search Term</TableHead>
                    <TableHead>Frequency</TableHead>
                    <TableHead>Time</TableHead>
                    <TableHead>Active</TableHead>
                    <TableHead>Last Run</TableHead>
                    <TableHead>Next Run</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {scheduled.length === 0 ? <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No scheduled reports</TableCell></TableRow>
                  : scheduled.map(s => (
                    <TableRow key={s.id}>
                      <TableCell className="font-medium">{s.search_term}</TableCell>
                      <TableCell className="capitalize">{s.schedule_frequency}</TableCell>
                      <TableCell>{s.schedule_time}</TableCell>
                      <TableCell><Badge variant={s.is_active ? "default" : "secondary"}>{s.is_active ? "Active" : "Paused"}</Badge></TableCell>
                      <TableCell className="text-xs">{s.last_run_at ? new Date(s.last_run_at).toLocaleString() : "Never"}</TableCell>
                      <TableCell className="text-xs">{s.next_run_at ? new Date(s.next_run_at).toLocaleString() : "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
