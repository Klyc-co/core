import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Globe, Clock, FileText, Download, Loader2, Play, Eye, ExternalLink,
} from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import type { User } from "@supabase/supabase-js";

interface ScheduledReport {
  id: string;
  search_term: string;
  schedule_time: string;
  schedule_frequency: string;
  is_active: boolean;
  last_run_at: string | null;
  created_at: string;
}

interface ReportResult {
  id: string;
  search_term: string;
  generated_at: string;
  sentiment: string;
  mentions: number;
  sources: number;
  positive_percent: number;
  neutral_percent: number;
  negative_percent: number;
  summary: string | null;
  raw_results: Array<{
    title?: string;
    url?: string;
    description?: string;
    markdown?: string;
  }> | null;
}

const quickTemplates = [
  { title: "Weekly Competitor Overview", description: "Monitor competitor activity", schedule: "Every Monday 9am", term: "competitor analysis" },
  { title: "Monthly Sentiment Tracker", description: "Track brand sentiment trends", schedule: "First day of month", term: "brand sentiment" },
  { title: "Daily Brand Mentions", description: "Immediate brand monitoring", schedule: "Daily at 8am", term: "brand mentions" },
];

const timeSlots = [
  { value: "06:00", label: "6:00 AM" }, { value: "07:00", label: "7:00 AM" }, { value: "08:00", label: "8:00 AM" },
  { value: "09:00", label: "9:00 AM" }, { value: "10:00", label: "10:00 AM" }, { value: "11:00", label: "11:00 AM" },
  { value: "12:00", label: "12:00 PM" }, { value: "13:00", label: "1:00 PM" }, { value: "14:00", label: "2:00 PM" },
  { value: "15:00", label: "3:00 PM" }, { value: "16:00", label: "4:00 PM" }, { value: "17:00", label: "5:00 PM" },
  { value: "18:00", label: "6:00 PM" }, { value: "19:00", label: "7:00 PM" }, { value: "20:00", label: "8:00 PM" },
  { value: "21:00", label: "9:00 PM" }, { value: "22:00", label: "10:00 PM" }, { value: "23:00", label: "11:00 PM" },
  { value: "00:00", label: "12:00 AM" }, { value: "01:00", label: "1:00 AM" },
];

export default function RunReportContent() {
  const { toast } = useToast();
  const [user, setUser] = useState<User | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [scheduledTime, setScheduledTime] = useState("08:00");
  const [timeDisplay, setTimeDisplay] = useState("8:00");
  const [amPm, setAmPm] = useState<"AM" | "PM">("AM");
  const [isScheduling, setIsScheduling] = useState(false);
  const [isRunningNow, setIsRunningNow] = useState(false);
  const [scheduledReports, setScheduledReports] = useState<ScheduledReport[]>([]);
  const [reportResults, setReportResults] = useState<ReportResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewingReport, setViewingReport] = useState<ReportResult | null>(null);

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUser(user);
      fetchData(user.id);
    };
    init();
  }, []);

  const fetchData = async (userId: string) => {
    setLoading(true);
    const [{ data: scheduled }, { data: results }] = await Promise.all([
      supabase.from("scheduled_reports").select("*").eq("user_id", userId).order("created_at", { ascending: false }),
      supabase.from("report_results").select("*").eq("user_id", userId).order("generated_at", { ascending: false }).limit(10),
    ]);
    setScheduledReports(scheduled || []);
    setReportResults((results || []).map(r => ({ ...r, raw_results: r.raw_results as ReportResult["raw_results"] })));
    setLoading(false);
  };

  const handleRunNow = async () => {
    if (!searchTerm || !user) return;
    setIsRunningNow(true);
    try {
      const { data, error } = await supabase.functions.invoke("run-report", { body: { searchTerm, userId: user.id } });
      if (error) throw error;
      toast({ title: "Report generated!", description: `Found ${data.resultsCount} sources` });
      setSearchTerm("");
      fetchData(user.id);
    } catch (error) {
      toast({ title: "Error", description: "Failed to run report.", variant: "destructive" });
    } finally {
      setIsRunningNow(false);
    }
  };

  const handleScheduleSearch = async () => {
    if (!searchTerm || !user) return;
    setIsScheduling(true);
    try {
      const { error } = await supabase.from("scheduled_reports").insert({ user_id: user.id, search_term: searchTerm, schedule_time: scheduledTime, schedule_frequency: "daily", is_active: true });
      if (error) throw error;
      toast({ title: "Scheduled!", description: `"${searchTerm}" will run daily at ${formatTime12Hour(scheduledTime)}` });
      setSearchTerm("");
      fetchData(user.id);
    } catch {
      toast({ title: "Error", description: "Failed to schedule.", variant: "destructive" });
    } finally {
      setIsScheduling(false);
    }
  };

  const handleRemoveScheduled = async (id: string) => {
    await supabase.from("scheduled_reports").delete().eq("id", id);
    setScheduledReports(scheduledReports.filter(s => s.id !== id));
    toast({ title: "Removed" });
  };

  const handleTimeInputChange = (value: string) => {
    setTimeDisplay(value);
    const m = value.match(/^(\d{1,2}):?(\d{0,2})$/);
    if (m) {
      let h = parseInt(m[1], 10);
      const min = m[2] ? m[2].padEnd(2, "0") : "00";
      if (h >= 1 && h <= 12) {
        if (amPm === "PM" && h !== 12) h += 12;
        else if (amPm === "AM" && h === 12) h = 0;
        setScheduledTime(`${h.toString().padStart(2, "0")}:${min}`);
      }
    }
  };

  const handleAmPmChange = (v: "AM" | "PM") => {
    setAmPm(v);
    const m = timeDisplay.match(/^(\d{1,2}):?(\d{0,2})$/);
    if (m) {
      let h = parseInt(m[1], 10);
      const min = m[2] ? m[2].padEnd(2, "0") : "00";
      if (h >= 1 && h <= 12) {
        if (v === "PM" && h !== 12) h += 12;
        else if (v === "AM" && h === 12) h = 0;
        setScheduledTime(`${h.toString().padStart(2, "0")}:${min}`);
      }
    }
  };

  const formatTime12Hour = (t: string) => {
    const slot = timeSlots.find(s => s.value === t);
    if (slot) return slot.label;
    const [hours, minutes] = t.split(":");
    const h = parseInt(hours, 10);
    return `${h % 12 || 12}:${minutes} ${h >= 12 ? "PM" : "AM"}`;
  };

  const getSentimentColor = (s: string) => {
    switch (s) {
      case "Positive": return "bg-green-100 text-green-700 border-green-200";
      case "Mixed": return "bg-yellow-100 text-yellow-700 border-yellow-200";
      case "Negative": return "bg-red-100 text-red-700 border-red-200";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const formatDate = (d: string) => format(new Date(d), "M/d/yyyy");

  const handleDownloadCSV = (report: ReportResult) => {
    const rows = [
      ["REPORT SUMMARY"], ["Search Term", report.search_term], ["Generated At", format(new Date(report.generated_at), "PPpp")],
      ["Sentiment", report.sentiment], ["Mentions", String(report.mentions)], ["Sources", String(report.sources)],
      ["Positive %", String(report.positive_percent)], ["Neutral %", String(report.neutral_percent)], ["Negative %", String(report.negative_percent)],
      ["Summary", report.summary || "N/A"], [""], ["SOURCES"], ["#", "Title", "URL", "Description"],
      ...(report.raw_results || []).map((s, i) => [String(i + 1), s.title || "N/A", s.url || "N/A", (s.description || "").substring(0, 500)]),
    ];
    const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `report-${report.search_term.replace(/\s+/g, "-")}-${format(new Date(report.generated_at), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadPDF = (report: ReportResult) => {
    const w = window.open("", "_blank");
    if (w) {
      w.document.write(`<!DOCTYPE html><html><head><title>Report: ${report.search_term}</title>
        <style>body{font-family:Arial;padding:40px;max-width:900px;margin:0 auto;line-height:1.6}h1{border-bottom:2px solid #007bff;padding-bottom:10px}.stats{display:grid;grid-template-columns:repeat(4,1fr);gap:20px;margin:20px 0}.stat{text-align:center;padding:15px;background:#f5f5f5;border-radius:8px}.stat-value{font-size:24px;font-weight:bold}.source{background:#fafafa;border:1px solid #eee;border-radius:8px;padding:15px;margin-bottom:15px;page-break-inside:avoid}</style></head>
        <body><h1>Brand Intelligence Report</h1><p>Search: <strong>${report.search_term}</strong></p><p>Generated: ${format(new Date(report.generated_at), "PPpp")}</p>
        <div class="stats"><div class="stat"><div class="stat-value">${report.mentions.toLocaleString()}</div><div>Mentions</div></div><div class="stat"><div class="stat-value">${report.sources}</div><div>Sources</div></div><div class="stat"><div class="stat-value" style="color:#22c55e">${report.positive_percent}%</div><div>Positive</div></div><div class="stat"><div class="stat-value" style="color:#ef4444">${report.negative_percent}%</div><div>Negative</div></div></div>
        ${report.summary ? `<div style="background:#f9f9f9;padding:15px;border-radius:8px"><h3>AI Summary</h3><p>${report.summary}</p></div>` : ""}
        <h2>Sources (${report.raw_results?.length || 0})</h2>
        ${(report.raw_results || []).map((s, i) => `<div class="source"><strong>${i + 1}. ${s.title || "Untitled"}</strong>${s.url ? `<br><a href="${s.url}">${s.url}</a>` : ""}${s.description ? `<p>${s.description}</p>` : ""}</div>`).join("")}
        </body></html>`);
      w.document.close();
      w.onload = () => w.print();
    }
  };

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6 mt-4">
      {/* Search Form */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          <div>
            <label className="text-sm font-medium text-foreground flex items-center gap-2 mb-2">
              <Globe className="w-4 h-4" /> Search Term
            </label>
            <Input placeholder="Enter a term to search..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-foreground flex items-center gap-2 mb-2">
                <Clock className="w-4 h-4" /> Schedule Time (Daily)
              </label>
              <div className="flex gap-2">
                <Input type="text" placeholder="8:00" value={timeDisplay} onChange={(e) => handleTimeInputChange(e.target.value)} className="flex-1" />
                <Select value={amPm} onValueChange={handleAmPmChange}>
                  <SelectTrigger className="w-20"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="AM">AM</SelectItem>
                    <SelectItem value="PM">PM</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex items-end">
              <Button variant="outline" className="w-full" onClick={handleRunNow} disabled={isRunningNow || !searchTerm}>
                {isRunningNow ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Play className="w-4 h-4 mr-2" />} Run Now
              </Button>
            </div>
          </div>
          <Button className="w-full" onClick={handleScheduleSearch} disabled={isScheduling || !searchTerm}>
            {isScheduling ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Clock className="w-4 h-4 mr-2" />} Schedule Daily Search
          </Button>
        </CardContent>
      </Card>

      {/* Reports */}
      {reportResults.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-foreground flex items-center gap-2 mb-4"><FileText className="w-5 h-5" /> Recent Reports</h3>
          <div className="space-y-4">
            {reportResults.map((report) => (
              <Card key={report.id}>
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h4 className="font-semibold text-foreground">{report.search_term}</h4>
                      <p className="text-sm text-muted-foreground flex items-center gap-1"><Clock className="w-3 h-3" /> {formatDate(report.generated_at)}</p>
                    </div>
                    <Badge className={getSentimentColor(report.sentiment)}>{report.sentiment}</Badge>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                    <div><p className="text-xs text-muted-foreground">Mentions</p><p className="text-lg font-bold text-foreground">{report.mentions.toLocaleString()}</p></div>
                    <div><p className="text-xs text-muted-foreground">Sources</p><p className="text-lg font-bold text-foreground">{report.sources}</p></div>
                    <div><p className="text-xs text-muted-foreground">Positive</p><p className="text-lg font-bold text-green-500">{report.positive_percent}%</p></div>
                    <div><p className="text-xs text-muted-foreground">Negative</p><p className="text-lg font-bold text-red-500">{report.negative_percent}%</p></div>
                  </div>
                  <div className="mb-4">
                    <div className="flex h-2 rounded-full overflow-hidden">
                      <div className="bg-green-500" style={{ width: `${report.positive_percent}%` }} />
                      <div className="bg-yellow-500" style={{ width: `${report.neutral_percent}%` }} />
                      <div className="bg-red-500" style={{ width: `${report.negative_percent}%` }} />
                    </div>
                    <div className="flex flex-wrap text-xs mt-1 gap-2">
                      <span className="text-green-500">{report.positive_percent}% Positive</span>
                      <span className="text-yellow-500">{report.neutral_percent}% Neutral</span>
                      <span className="text-red-500">{report.negative_percent}% Negative</span>
                    </div>
                  </div>
                  {report.summary && <div className="bg-muted/50 rounded-lg p-3 mb-4"><p className="text-sm text-muted-foreground">{report.summary}</p></div>}
                  <div className="flex flex-col sm:flex-row gap-2">
                    <Button variant="outline" size="sm" className="flex-1" onClick={() => setViewingReport(report)}>
                      <Eye className="w-4 h-4 mr-2" /> View ({report.raw_results?.length || 0})
                    </Button>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" className="flex-1" onClick={() => handleDownloadPDF(report)}><Download className="w-4 h-4 mr-2" /> PDF</Button>
                      <Button variant="outline" size="sm" className="flex-1" onClick={() => handleDownloadCSV(report)}><FileText className="w-4 h-4 mr-2" /> CSV</Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Templates */}
      <div>
        <h3 className="text-lg font-semibold text-foreground flex items-center gap-2 mb-4"><Clock className="w-5 h-5" /> Quick Schedule Templates</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {quickTemplates.map((t, i) => (
            <Card key={i} className="hover:border-primary/50 transition-colors cursor-pointer">
              <CardContent className="pt-4 pb-4">
                <h4 className="font-medium text-foreground text-sm">{t.title}</h4>
                <p className="text-xs text-muted-foreground mb-2">{t.description}</p>
                <p className="text-xs text-muted-foreground flex items-center gap-1 mb-3"><Clock className="w-3 h-3" />{t.schedule}</p>
                <Button variant="outline" size="sm" className="w-full" onClick={() => { setSearchTerm(t.term); setScheduledTime("08:00"); setTimeDisplay("8:00"); setAmPm("AM"); }}>Add Template</Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Scheduled */}
      {scheduledReports.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-foreground mb-4">Scheduled Searches</h3>
          <div className="space-y-2">
            {scheduledReports.map((r) => (
              <Card key={r.id}>
                <CardContent className="py-3 flex items-center justify-between">
                  <div>
                    <p className="font-medium text-foreground">{r.search_term}</p>
                    <p className="text-sm text-muted-foreground"><Clock className="w-3 h-3 inline mr-1" />Daily at {formatTime12Hour(r.schedule_time)}{r.last_run_at && ` • Last: ${formatDate(r.last_run_at)}`}</p>
                  </div>
                  <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive hover:bg-destructive/5" onClick={() => handleRemoveScheduled(r.id)}>Remove</Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* View Dialog */}
      <Dialog open={!!viewingReport} onOpenChange={() => setViewingReport(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><FileText className="w-5 h-5" /> Report: {viewingReport?.search_term}</DialogTitle>
          </DialogHeader>
          {viewingReport && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 bg-muted/50 rounded-lg">
                <div className="text-center"><p className="text-2xl font-bold">{viewingReport.mentions.toLocaleString()}</p><p className="text-xs text-muted-foreground">Mentions</p></div>
                <div className="text-center"><p className="text-2xl font-bold">{viewingReport.sources}</p><p className="text-xs text-muted-foreground">Sources</p></div>
                <div className="text-center"><p className="text-2xl font-bold text-green-500">{viewingReport.positive_percent}%</p><p className="text-xs text-muted-foreground">Positive</p></div>
                <div className="text-center"><p className="text-2xl font-bold text-red-500">{viewingReport.negative_percent}%</p><p className="text-xs text-muted-foreground">Negative</p></div>
              </div>
              {viewingReport.summary && <div className="p-3 bg-muted/30 rounded-lg"><p className="text-sm font-medium mb-1">AI Summary</p><p className="text-sm text-muted-foreground">{viewingReport.summary}</p></div>}
              <div>
                <p className="text-sm font-medium mb-2">All Sources ({viewingReport.raw_results?.length || 0})</p>
                <ScrollArea className="h-[400px]">
                  <div className="space-y-3 pr-4">
                    {(viewingReport.raw_results || []).map((s, i) => (
                      <div key={i} className="p-4 border rounded-lg bg-card hover:bg-accent/50 transition-colors">
                        <div className="flex items-start gap-3">
                          <Badge variant="outline">{i + 1}</Badge>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium text-sm line-clamp-2">{s.title || "Untitled"}</h4>
                            {s.url && <a href={s.url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline flex items-center gap-1 mt-1"><ExternalLink className="w-3 h-3" />{s.url.length > 60 ? s.url.substring(0, 60) + "..." : s.url}</a>}
                            {s.description && <p className="text-sm text-muted-foreground mt-2 line-clamp-3">{s.description}</p>}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
              <div className="flex gap-2 pt-2 border-t">
                <Button variant="outline" className="flex-1" onClick={() => handleDownloadPDF(viewingReport)}><Download className="w-4 h-4 mr-2" /> PDF</Button>
                <Button variant="outline" className="flex-1" onClick={() => handleDownloadCSV(viewingReport)}><FileText className="w-4 h-4 mr-2" /> CSV</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
