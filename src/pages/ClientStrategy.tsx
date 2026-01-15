import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Globe, 
  Clock, 
  FileText, 
  Download, 
  BarChart3,
  Loader2,
  Play,
  TrendingUp,
  Eye,
  ExternalLink,
  Users
} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import ClientHeader from "@/components/ClientHeader";
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

const timeSlots = [
  { value: "06:00", label: "6:00 AM" },
  { value: "07:00", label: "7:00 AM" },
  { value: "08:00", label: "8:00 AM" },
  { value: "09:00", label: "9:00 AM" },
  { value: "10:00", label: "10:00 AM" },
  { value: "11:00", label: "11:00 AM" },
  { value: "12:00", label: "12:00 PM" },
  { value: "13:00", label: "1:00 PM" },
  { value: "14:00", label: "2:00 PM" },
  { value: "15:00", label: "3:00 PM" },
  { value: "16:00", label: "4:00 PM" },
  { value: "17:00", label: "5:00 PM" },
  { value: "18:00", label: "6:00 PM" },
];

const ClientStrategy = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [user, setUser] = useState<User | null>(null);
  const [activeModule, setActiveModule] = useState<"run-report" | "trend-monitor" | "competitor-analysis">("run-report");
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
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/client/auth");
        return;
      }
      setUser(user);
      fetchData(user.id);
    };
    checkUser();
  }, [navigate]);

  const fetchData = async (userId: string) => {
    setLoading(true);
    
    const { data: scheduled } = await supabase
      .from('scheduled_reports')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    
    const { data: results } = await supabase
      .from('report_results')
      .select('*')
      .eq('user_id', userId)
      .order('generated_at', { ascending: false })
      .limit(10);
    
    setScheduledReports(scheduled || []);
    setReportResults((results || []).map(r => ({
      ...r,
      raw_results: r.raw_results as ReportResult['raw_results']
    })));
    setLoading(false);
  };

  const handleRunNow = async () => {
    if (!searchTerm || !user) {
      toast({ title: "Missing search term", description: "Please enter a search term", variant: "destructive" });
      return;
    }
    
    setIsRunningNow(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('run-report', {
        body: { searchTerm, userId: user.id }
      });
      
      if (error) throw error;
      
      toast({ title: "Report generated!", description: `Found ${data.resultsCount} sources for "${searchTerm}"` });
      setSearchTerm("");
      fetchData(user.id);
    } catch (error) {
      console.error('Error running report:', error);
      toast({ title: "Error", description: "Failed to run report. Please try again.", variant: "destructive" });
    } finally {
      setIsRunningNow(false);
    }
  };

  const handleScheduleSearch = async () => {
    if (!searchTerm || !scheduledTime || !user) {
      toast({ title: "Missing fields", description: "Please fill in all fields", variant: "destructive" });
      return;
    }
    
    setIsScheduling(true);
    
    try {
      const { error } = await supabase
        .from('scheduled_reports')
        .insert({
          user_id: user.id,
          search_term: searchTerm,
          schedule_time: scheduledTime,
          schedule_frequency: 'daily',
          is_active: true
        });
      
      if (error) throw error;
      
      toast({ title: "Search scheduled!", description: `"${searchTerm}" will run daily at ${formatTime12Hour(scheduledTime)}` });
      setSearchTerm("");
      fetchData(user.id);
    } catch (error) {
      console.error('Error scheduling:', error);
      toast({ title: "Error", description: "Failed to schedule search", variant: "destructive" });
    } finally {
      setIsScheduling(false);
    }
  };

  const handleRemoveScheduled = async (id: string) => {
    const { error } = await supabase
      .from('scheduled_reports')
      .delete()
      .eq('id', id);
    
    if (error) {
      toast({ title: "Error", description: "Failed to remove scheduled search", variant: "destructive" });
    } else {
      setScheduledReports(scheduledReports.filter(s => s.id !== id));
      toast({ title: "Removed", description: "Scheduled search cancelled" });
    }
  };

  const handleTimeInputChange = (value: string) => {
    setTimeDisplay(value);
    const timeMatch = value.match(/^(\d{1,2}):?(\d{0,2})$/);
    if (timeMatch) {
      let hours = parseInt(timeMatch[1], 10);
      const minutes = timeMatch[2] ? timeMatch[2].padEnd(2, '0') : '00';
      
      if (hours >= 1 && hours <= 12) {
        if (amPm === "PM" && hours !== 12) {
          hours += 12;
        } else if (amPm === "AM" && hours === 12) {
          hours = 0;
        }
        setScheduledTime(`${hours.toString().padStart(2, '0')}:${minutes}`);
      }
    }
  };

  const handleAmPmChange = (value: "AM" | "PM") => {
    setAmPm(value);
    const timeMatch = timeDisplay.match(/^(\d{1,2}):?(\d{0,2})$/);
    if (timeMatch) {
      let hours = parseInt(timeMatch[1], 10);
      const minutes = timeMatch[2] ? timeMatch[2].padEnd(2, '0') : '00';
      
      if (hours >= 1 && hours <= 12) {
        if (value === "PM" && hours !== 12) {
          hours += 12;
        } else if (value === "AM" && hours === 12) {
          hours = 0;
        }
        setScheduledTime(`${hours.toString().padStart(2, '0')}:${minutes}`);
      }
    }
  };

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case "Positive": return "bg-green-100 text-green-700 border-green-200";
      case "Mixed": return "bg-yellow-100 text-yellow-700 border-yellow-200";
      case "Negative": return "bg-red-100 text-red-700 border-red-200";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), "M/d/yyyy");
  };

  const formatTime12Hour = (time24: string) => {
    const slot = timeSlots.find(t => t.value === time24);
    if (slot) return slot.label;
    const [hours, minutes] = time24.split(':');
    const hour = parseInt(hours, 10);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  };

  const handleDownloadCSV = (report: ReportResult) => {
    const headerRows = [
      ['REPORT SUMMARY'],
      ['Search Term', report.search_term],
      ['Generated At', format(new Date(report.generated_at), "PPpp")],
      ['Sentiment', report.sentiment],
      ['Mentions', report.mentions.toString()],
      ['Sources', report.sources.toString()],
      [''],
      ['SOURCES'],
      ['#', 'Title', 'URL', 'Description'],
    ];

    const sourceRows = (report.raw_results || []).map((source, index) => [
      (index + 1).toString(),
      source.title || 'N/A',
      source.url || 'N/A',
      (source.description || '').substring(0, 500),
    ]);

    const allRows = [...headerRows, ...sourceRows];
    const csvContent = allRows
      .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `report-${report.search_term.replace(/\s+/g, '-')}-${format(new Date(report.generated_at), 'yyyy-MM-dd')}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    toast({ title: "CSV Downloaded", description: `Report exported` });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <ClientHeader user={user} />
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <ClientHeader user={user} />
      
      {/* Page Header */}
      <div className="border-b border-border bg-card/50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <h1 className="text-2xl font-bold text-foreground">Brand Strategy</h1>
          <p className="text-muted-foreground mt-1">
            AI-powered brand and market intelligence for your business
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex gap-8">
          {/* Left Sidebar - Strategy Modules */}
          <div className="w-64 flex-shrink-0">
            <h2 className="text-sm font-semibold text-foreground mb-4">Strategy Modules</h2>
            <nav className="space-y-1">
              <button
                onClick={() => setActiveModule("run-report")}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors ${
                  activeModule === "run-report" 
                    ? "bg-primary/10 text-primary" 
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                <Globe className="w-4 h-4" />
                <span className="text-sm font-medium">Run Report</span>
              </button>
              
              <button
                onClick={() => navigate("/client/strategy/trends")}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <TrendingUp className="w-4 h-4" />
                <span className="text-sm font-medium">Trend Monitor</span>
              </button>
              
              <button
                onClick={() => navigate("/client/strategy/competitors")}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <Users className="w-4 h-4" />
                <span className="text-sm font-medium">Competitor Analysis</span>
              </button>
            </nav>
          </div>

          {/* Main Content */}
          <div className="flex-1">
            {/* Run Report Section */}
            <Card className="mb-6">
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Globe className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">Run Report</h3>
                    <p className="text-sm text-muted-foreground">Search the web for brand intelligence</p>
                  </div>
                </div>

                <div className="flex gap-3 mb-4">
                  <Input
                    placeholder="Enter search term (e.g., your brand name, industry topic)"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="flex-1"
                  />
                  <Button 
                    onClick={handleRunNow}
                    disabled={!searchTerm || isRunningNow}
                    className="gap-2"
                  >
                    {isRunningNow ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Running...
                      </>
                    ) : (
                      <>
                        <Play className="w-4 h-4" />
                        Run Now
                      </>
                    )}
                  </Button>
                </div>

                {/* Schedule Section */}
                <div className="flex items-center gap-3 pt-4 border-t border-border">
                  <Clock className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Schedule daily at:</span>
                  <Input
                    value={timeDisplay}
                    onChange={(e) => handleTimeInputChange(e.target.value)}
                    placeholder="8:00"
                    className="w-20"
                  />
                  <Select value={amPm} onValueChange={(v) => handleAmPmChange(v as "AM" | "PM")}>
                    <SelectTrigger className="w-20">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="AM">AM</SelectItem>
                      <SelectItem value="PM">PM</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={handleScheduleSearch}
                    disabled={!searchTerm || isScheduling}
                  >
                    {isScheduling ? <Loader2 className="w-4 h-4 animate-spin" /> : "Schedule"}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Scheduled Reports */}
            {scheduledReports.length > 0 && (
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-foreground mb-3">Scheduled Reports</h3>
                <div className="space-y-2">
                  {scheduledReports.map((report) => (
                    <Card key={report.id} className="p-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Clock className="w-4 h-4 text-muted-foreground" />
                          <span className="font-medium text-foreground">{report.search_term}</span>
                          <Badge variant="secondary">
                            Daily at {formatTime12Hour(report.schedule_time)}
                          </Badge>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleRemoveScheduled(report.id)}
                          className="text-red-500 hover:text-red-600 hover:bg-red-50"
                        >
                          Remove
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Report Results */}
            <div>
              <h3 className="text-sm font-semibold text-foreground mb-3">Recent Reports</h3>
              {reportResults.length === 0 ? (
                <Card className="p-8 text-center border-dashed">
                  <FileText className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
                  <p className="text-muted-foreground">No reports yet. Run your first report above.</p>
                </Card>
              ) : (
                <div className="space-y-3">
                  {reportResults.map((report) => (
                    <Card key={report.id} className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div>
                            <h4 className="font-medium text-foreground">{report.search_term}</h4>
                            <p className="text-sm text-muted-foreground">
                              {formatDate(report.generated_at)} • {report.sources} sources
                            </p>
                          </div>
                          <Badge className={getSentimentColor(report.sentiment)}>
                            {report.sentiment}
                          </Badge>
                        </div>
                        <div className="flex gap-2">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => setViewingReport(report)}
                          >
                            <Eye className="w-4 h-4 mr-1" />
                            View
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleDownloadCSV(report)}
                          >
                            <Download className="w-4 h-4 mr-1" />
                            CSV
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* View Report Dialog */}
      <Dialog open={!!viewingReport} onOpenChange={() => setViewingReport(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Report: {viewingReport?.search_term}</DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh]">
            {viewingReport && (
              <div className="space-y-6 p-4">
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center p-4 bg-muted rounded-lg">
                    <p className="text-2xl font-bold text-foreground">{viewingReport.mentions}</p>
                    <p className="text-sm text-muted-foreground">Mentions</p>
                  </div>
                  <div className="text-center p-4 bg-muted rounded-lg">
                    <p className="text-2xl font-bold text-foreground">{viewingReport.sources}</p>
                    <p className="text-sm text-muted-foreground">Sources</p>
                  </div>
                  <div className="text-center p-4 bg-muted rounded-lg">
                    <Badge className={getSentimentColor(viewingReport.sentiment)}>
                      {viewingReport.sentiment}
                    </Badge>
                    <p className="text-sm text-muted-foreground mt-1">Sentiment</p>
                  </div>
                </div>

                {viewingReport.summary && (
                  <div>
                    <h4 className="font-medium text-foreground mb-2">Summary</h4>
                    <p className="text-muted-foreground">{viewingReport.summary}</p>
                  </div>
                )}

                <div>
                  <h4 className="font-medium text-foreground mb-3">Sources ({viewingReport.raw_results?.length || 0})</h4>
                  <div className="space-y-3">
                    {viewingReport.raw_results?.map((source, index) => (
                      <div key={index} className="p-3 bg-muted/50 rounded-lg">
                        <div className="flex items-start gap-3">
                          <span className="w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">
                            {index + 1}
                          </span>
                          <div className="flex-1 min-w-0">
                            <h5 className="font-medium text-foreground text-sm">{source.title || 'Untitled'}</h5>
                            {source.url && (
                              <a 
                                href={source.url} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-xs text-primary hover:underline flex items-center gap-1 mt-1"
                              >
                                {source.url.substring(0, 60)}...
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            )}
                            {source.description && (
                              <p className="text-sm text-muted-foreground mt-2">{source.description}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ClientStrategy;
