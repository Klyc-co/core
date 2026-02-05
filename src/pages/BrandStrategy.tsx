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
  Users,
  Menu,
  Palette
} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import AppHeader from "@/components/AppHeader";
import StrategyMobileNav from "@/components/StrategyMobileNav";
import { useIsMobile } from "@/hooks/use-mobile";
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
  { value: "19:00", label: "7:00 PM" },
  { value: "20:00", label: "8:00 PM" },
  { value: "21:00", label: "9:00 PM" },
  { value: "22:00", label: "10:00 PM" },
  { value: "23:00", label: "11:00 PM" },
  { value: "00:00", label: "12:00 AM" },
  { value: "01:00", label: "1:00 AM" },
  { value: "02:00", label: "2:00 AM" },
  { value: "03:00", label: "3:00 AM" },
  { value: "04:00", label: "4:00 AM" },
  { value: "05:00", label: "5:00 AM" },
];

const quickTemplates = [
  {
    title: "Weekly Competitor Overview",
    description: "Monitor competitor activity",
    schedule: "Every Monday 9am",
    term: "competitor analysis"
  },
  {
    title: "Monthly Sentiment Tracker",
    description: "Track brand sentiment trends",
    schedule: "First day of month",
    term: "brand sentiment"
  },
  {
    title: "Daily Brand Mentions",
    description: "Immediate brand monitoring",
    schedule: "Daily at 8am",
    term: "brand mentions"
  }
];

const BrandStrategy = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  
  const [user, setUser] = useState<User | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [scheduledDate, setScheduledDate] = useState<Date | undefined>();
  const [scheduledTime, setScheduledTime] = useState("08:00");
  const [timeDisplay, setTimeDisplay] = useState("8:00");
  const [amPm, setAmPm] = useState<"AM" | "PM">("AM");
  const [isScheduling, setIsScheduling] = useState(false);
  const [isRunningNow, setIsRunningNow] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  const [scheduledReports, setScheduledReports] = useState<ScheduledReport[]>([]);
  const [reportResults, setReportResults] = useState<ReportResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewingReport, setViewingReport] = useState<ReportResult | null>(null);

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }
      setUser(user);
      fetchData(user.id);
    };
    checkUser();
  }, [navigate]);

  const fetchData = async (userId: string) => {
    setLoading(true);
    
    // Fetch scheduled reports
    const { data: scheduled } = await supabase
      .from('scheduled_reports')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    
    // Fetch report results
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

  const handleAddTemplate = (template: typeof quickTemplates[0]) => {
    setSearchTerm(template.term);
    setScheduledTime("08:00");
    setTimeDisplay("8:00");
    setAmPm("AM");
  };

  const handleTimeInputChange = (value: string) => {
    setTimeDisplay(value);
    // Parse the time and update scheduledTime in 24-hour format
    const timeMatch = value.match(/^(\d{1,2}):?(\d{0,2})$/);
    if (timeMatch) {
      let hours = parseInt(timeMatch[1], 10);
      const minutes = timeMatch[2] ? timeMatch[2].padEnd(2, '0') : '00';
      
      if (hours >= 1 && hours <= 12) {
        // Convert to 24-hour format based on AM/PM
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
    // Recalculate 24-hour time with new AM/PM
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
    // Fallback for times not in our list
    const [hours, minutes] = time24.split(':');
    const hour = parseInt(hours, 10);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  };

  const handleDownloadCSV = (report: ReportResult) => {
    // Header rows
    const headerRows = [
      ['REPORT SUMMARY'],
      ['Search Term', report.search_term],
      ['Generated At', format(new Date(report.generated_at), "PPpp")],
      ['Sentiment', report.sentiment],
      ['Mentions', report.mentions.toString()],
      ['Sources', report.sources.toString()],
      ['Positive %', report.positive_percent.toString()],
      ['Neutral %', report.neutral_percent.toString()],
      ['Negative %', report.negative_percent.toString()],
      ['Summary', report.summary || 'N/A'],
      [''],
      ['SOURCES'],
      ['#', 'Title', 'URL', 'Description'],
    ];

    // Source rows
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
    
    toast({ title: "CSV Downloaded", description: `Report with ${report.raw_results?.length || 0} sources exported` });
  };

  const handleDownloadPDF = (report: ReportResult) => {
    const sourcesHTML = (report.raw_results || []).map((source, index) => `
      <div class="source">
        <div class="source-header">
          <span class="source-num">${index + 1}</span>
          <h4>${source.title || 'Untitled'}</h4>
        </div>
        ${source.url ? `<a href="${source.url}" class="source-url">${source.url}</a>` : ''}
        ${source.description ? `<p class="source-desc">${source.description}</p>` : ''}
      </div>
    `).join('');

    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Report: ${report.search_term}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 40px; max-width: 900px; margin: 0 auto; line-height: 1.6; }
          h1 { color: #333; border-bottom: 2px solid #007bff; padding-bottom: 10px; }
          h2 { color: #444; margin-top: 30px; border-bottom: 1px solid #ddd; padding-bottom: 8px; }
          .meta { color: #666; margin-bottom: 10px; }
          .stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; margin: 20px 0; }
          .stat { text-align: center; padding: 15px; background: #f5f5f5; border-radius: 8px; }
          .stat-value { font-size: 24px; font-weight: bold; color: #333; }
          .stat-label { font-size: 12px; color: #666; }
          .positive { color: #22c55e; }
          .negative { color: #ef4444; }
          .sentiment-bar { display: flex; height: 20px; border-radius: 10px; overflow: hidden; margin: 20px 0; }
          .summary { background: #f9f9f9; padding: 15px; border-radius: 8px; margin-top: 20px; }
          .badge { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 14px; font-weight: bold; }
          .badge-positive { background: #dcfce7; color: #166534; }
          .badge-mixed { background: #fef9c3; color: #854d0e; }
          .badge-negative { background: #fee2e2; color: #991b1b; }
          .sources-section { margin-top: 30px; }
          .source { background: #fafafa; border: 1px solid #eee; border-radius: 8px; padding: 15px; margin-bottom: 15px; page-break-inside: avoid; }
          .source-header { display: flex; align-items: center; gap: 10px; margin-bottom: 8px; }
          .source-num { background: #007bff; color: white; width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: bold; flex-shrink: 0; }
          .source h4 { margin: 0; color: #333; font-size: 14px; }
          .source-url { color: #007bff; font-size: 12px; word-break: break-all; display: block; margin-bottom: 8px; }
          .source-desc { color: #666; font-size: 13px; margin: 0; }
          @media print { .source { break-inside: avoid; } }
        </style>
      </head>
      <body>
        <h1>Brand Intelligence Report</h1>
        <p class="meta">Search Term: <strong>${report.search_term}</strong></p>
        <p class="meta">Generated: ${format(new Date(report.generated_at), "PPpp")}</p>
        <p>Overall Sentiment: <span class="badge badge-${report.sentiment.toLowerCase()}">${report.sentiment}</span></p>
        
        <div class="stats">
          <div class="stat">
            <div class="stat-value">${report.mentions.toLocaleString()}</div>
            <div class="stat-label">Mentions</div>
          </div>
          <div class="stat">
            <div class="stat-value">${report.sources}</div>
            <div class="stat-label">Sources</div>
          </div>
          <div class="stat">
            <div class="stat-value positive">${report.positive_percent}%</div>
            <div class="stat-label">Positive</div>
          </div>
          <div class="stat">
            <div class="stat-value negative">${report.negative_percent}%</div>
            <div class="stat-label">Negative</div>
          </div>
        </div>

        <h3>Sentiment Breakdown</h3>
        <div class="sentiment-bar">
          <div style="width: ${report.positive_percent}%; background: #22c55e;"></div>
          <div style="width: ${report.neutral_percent}%; background: #eab308;"></div>
          <div style="width: ${report.negative_percent}%; background: #ef4444;"></div>
        </div>
        <p>${report.positive_percent}% Positive | ${report.neutral_percent}% Neutral | ${report.negative_percent}% Negative</p>

        ${report.summary ? `
        <div class="summary">
          <h3>AI Summary</h3>
          <p>${report.summary}</p>
        </div>
        ` : ''}

        <div class="sources-section">
          <h2>All Sources (${report.raw_results?.length || 0})</h2>
          ${sourcesHTML || '<p>No sources available</p>'}
        </div>
        
        <p style="margin-top: 40px; color: #999; font-size: 12px;">Generated by Klyc Brand Intelligence</p>
      </body>
      </html>
    `;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(printContent);
      printWindow.document.close();
      printWindow.onload = () => {
        printWindow.print();
      };
    }
    
    toast({ title: "PDF Ready", description: `Report with ${report.raw_results?.length || 0} sources - save as PDF` });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Strategy sidebar navigation content
  const SidebarNav = () => (
    <nav className="space-y-1">
      <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg bg-primary/10 text-primary border-l-2 border-primary">
        <BarChart3 className="w-4 h-4" />
        <div className="text-left">
          <div className="text-sm font-medium">Run Report</div>
          <div className="text-xs text-muted-foreground">Schedule and run web reports</div>
        </div>
      </button>
      <button 
        onClick={() => {
          setMobileMenuOpen(false);
          navigate("/competitor-analysis");
        }}
        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-muted text-foreground"
      >
        <Users className="w-4 h-4" />
        <div className="text-left">
          <div className="text-sm font-medium">Competitor Analysis</div>
          <div className="text-xs text-muted-foreground">Analyze competitors</div>
        </div>
      </button>
      <button 
        onClick={() => {
          setMobileMenuOpen(false);
          navigate("/trend-monitor");
        }}
        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-muted text-foreground"
      >
        <TrendingUp className="w-4 h-4" />
        <div className="text-left">
          <div className="text-sm font-medium">Trend Monitor</div>
          <div className="text-xs text-muted-foreground">Track social media trends</div>
        </div>
      </button>
      <button 
        onClick={() => {
          setMobileMenuOpen(false);
          navigate("/image-editor");
        }}
        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-muted text-foreground"
      >
        <Palette className="w-4 h-4" />
        <div className="text-left">
          <div className="text-sm font-medium">Image Editor</div>
          <div className="text-xs text-muted-foreground">Create visual content</div>
        </div>
      </button>
    </nav>
  );

  return (
    <div className="min-h-screen bg-background">
      <AppHeader user={user} />
      
      {/* Mobile Strategy Navigation */}
      {isMobile && <StrategyMobileNav />}
      
      {/* Page Header */}
      <div className="border-b border-border bg-card/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            {/* Mobile menu button */}
            {isMobile && (
              <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
                <SheetTrigger asChild>
                  <Button variant="outline" size="icon" className="shrink-0">
                    <Menu className="w-4 h-4" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-[280px] p-4">
                  <h2 className="text-sm font-semibold text-foreground mb-4">Strategy Modules</h2>
                  <SidebarNav />
                </SheetContent>
              </Sheet>
            )}
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-foreground">Brand Strategy</h1>
              <p className="text-sm text-muted-foreground mt-1 hidden sm:block">
                AI-powered brand and market intelligence for creative, audience, and SEO strategy.
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            onClick={() => navigate("/projects")}
            className="gap-2 w-full sm:w-auto"
          >
            <FileText className="w-4 h-4" />
            Content
          </Button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <div className="flex gap-8">
          {/* Left Sidebar - Strategy Modules (Desktop only) */}
          {!isMobile && (
            <div className="w-64 flex-shrink-0">
              <h2 className="text-sm font-semibold text-foreground mb-4">Strategy Modules</h2>
              <SidebarNav />
            </div>
          )}

          {/* Main Content */}
          <div className="flex-1 space-y-8">
            {/* Run Report Section */}
            <div>
              <h2 className="text-xl font-bold text-foreground mb-2">Run Report</h2>
              <p className="text-muted-foreground mb-6">
                Schedule AI-powered searches across the web to generate comprehensive reports.
              </p>

              {/* Search Form */}
              <Card className="mb-8">
                <CardContent className="pt-6 space-y-4">
                  <div>
                    <label className="text-sm font-medium text-foreground flex items-center gap-2 mb-2">
                      <Globe className="w-4 h-4" />
                      Search Term
                    </label>
                    <Input
                      placeholder="Enter a term to search on the web (e.g., 'your brand name', 'industry trends')"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-foreground flex items-center gap-2 mb-2">
                        <Clock className="w-4 h-4" />
                        Schedule Time (Daily)
                      </label>
                      <div className="flex gap-2">
                        <Input
                          type="text"
                          placeholder="8:00"
                          value={timeDisplay}
                          onChange={(e) => handleTimeInputChange(e.target.value)}
                          className="flex-1"
                        />
                        <Select value={amPm} onValueChange={handleAmPmChange}>
                          <SelectTrigger className="w-20">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="AM">AM</SelectItem>
                            <SelectItem value="PM">PM</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="flex items-end">
                      <Button 
                        variant="outline"
                        className="w-full" 
                        onClick={handleRunNow}
                        disabled={isRunningNow || !searchTerm}
                      >
                        {isRunningNow ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <Play className="w-4 h-4 mr-2" />
                        )}
                        Run Now
                      </Button>
                    </div>
                  </div>

                  <Button 
                    className="w-full" 
                    onClick={handleScheduleSearch}
                    disabled={isScheduling || !searchTerm}
                  >
                    {isScheduling ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Clock className="w-4 h-4 mr-2" />
                    )}
                    Schedule Daily Search
                  </Button>
                </CardContent>
              </Card>

              {/* Current Reports */}
              {reportResults.length > 0 && (
                <div className="mb-8">
                  <h3 className="text-lg font-semibold text-foreground flex items-center gap-2 mb-4">
                    <FileText className="w-5 h-5" />
                    Recent Reports
                  </h3>
                  <div className="space-y-4">
                    {reportResults.map((report) => (
                      <Card key={report.id}>
                        <CardContent className="pt-6">
                          <div className="flex items-start justify-between mb-4">
                            <div>
                              <h4 className="font-semibold text-foreground">{report.search_term}</h4>
                              <p className="text-sm text-muted-foreground flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                Generated on {formatDate(report.generated_at)}
                              </p>
                            </div>
                            <Badge className={getSentimentColor(report.sentiment)}>
                              {report.sentiment}
                            </Badge>
                          </div>

                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-4">
                            <div>
                              <p className="text-xs text-muted-foreground">Mentions</p>
                              <p className="text-lg sm:text-xl font-bold text-foreground">{report.mentions.toLocaleString()}</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Sources</p>
                              <p className="text-lg sm:text-xl font-bold text-foreground">{report.sources}</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Positive</p>
                              <p className="text-lg sm:text-xl font-bold text-green-500">{report.positive_percent}%</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Negative</p>
                              <p className="text-lg sm:text-xl font-bold text-red-500">{report.negative_percent}%</p>
                            </div>
                          </div>

                          <div className="mb-4">
                            <p className="text-sm font-medium text-foreground mb-2">Sentiment Breakdown</p>
                            <div className="flex h-2 rounded-full overflow-hidden">
                              <div 
                                className="bg-green-500" 
                                style={{ width: `${report.positive_percent}%` }}
                              />
                              <div 
                                className="bg-yellow-500" 
                                style={{ width: `${report.neutral_percent}%` }}
                              />
                              <div 
                                className="bg-red-500" 
                                style={{ width: `${report.negative_percent}%` }}
                              />
                            </div>
                            <div className="flex flex-wrap text-xs mt-1 gap-2 sm:gap-4">
                              <span className="text-green-500">{report.positive_percent}% Positive</span>
                              <span className="text-yellow-500">{report.neutral_percent}% Neutral</span>
                              <span className="text-red-500">{report.negative_percent}% Negative</span>
                            </div>
                          </div>

                          {report.summary && (
                            <div className="bg-muted/50 rounded-lg p-3 mb-4">
                              <p className="text-sm text-muted-foreground">{report.summary}</p>
                            </div>
                          )}

                          <div className="flex flex-col sm:flex-row gap-2">
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="flex-1"
                              onClick={() => setViewingReport(report)}
                            >
                              <Eye className="w-4 h-4 mr-2" />
                              View ({report.raw_results?.length || 0})
                            </Button>
                            <div className="flex gap-2">
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="flex-1"
                                onClick={() => handleDownloadPDF(report)}
                              >
                                <Download className="w-4 h-4 mr-2" />
                                PDF
                              </Button>
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="flex-1"
                                onClick={() => handleDownloadCSV(report)}
                              >
                                <FileText className="w-4 h-4 mr-2" />
                                CSV
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {/* Quick Schedule Templates */}
              <div className="mb-8">
                <h3 className="text-lg font-semibold text-foreground flex items-center gap-2 mb-4">
                  <Clock className="w-5 h-5" />
                  Quick Schedule Templates
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                  {quickTemplates.map((template, index) => (
                    <Card key={index} className="hover:border-primary/50 transition-colors cursor-pointer">
                      <CardContent className="pt-4 pb-4">
                        <h4 className="font-medium text-foreground text-sm">{template.title}</h4>
                        <p className="text-xs text-muted-foreground mb-2">{template.description}</p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mb-3">
                          <Clock className="w-3 h-3" />
                          {template.schedule}
                        </p>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="w-full"
                          onClick={() => handleAddTemplate(template)}
                        >
                          Add Template
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>

              {/* Scheduled Searches */}
              {scheduledReports.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-foreground mb-4">Scheduled Searches</h3>
                  <div className="space-y-2">
                    {scheduledReports.map((report) => (
                      <Card key={report.id}>
                        <CardContent className="py-3 flex items-center justify-between">
                          <div>
                            <p className="font-medium text-foreground">{report.search_term}</p>
                            <p className="text-sm text-muted-foreground flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              Daily at {formatTime12Hour(report.schedule_time)}
                              {report.last_run_at && ` • Last run: ${formatDate(report.last_run_at)}`}
                            </p>
                          </div>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="text-red-500 hover:text-red-600 hover:bg-red-50"
                            onClick={() => handleRemoveScheduled(report.id)}
                          >
                            Remove
                          </Button>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* View Sources Dialog */}
      <Dialog open={!!viewingReport} onOpenChange={() => setViewingReport(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] w-[95vw] sm:w-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
              <FileText className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
              <span className="truncate">Report: {viewingReport?.search_term}</span>
            </DialogTitle>
          </DialogHeader>
          
          {viewingReport && (
            <div className="space-y-4">
              {/* Summary Stats */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 p-3 sm:p-4 bg-muted/50 rounded-lg">
                <div className="text-center">
                  <p className="text-lg sm:text-2xl font-bold">{viewingReport.mentions.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">Mentions</p>
                </div>
                <div className="text-center">
                  <p className="text-lg sm:text-2xl font-bold">{viewingReport.sources}</p>
                  <p className="text-xs text-muted-foreground">Sources</p>
                </div>
                <div className="text-center">
                  <p className="text-lg sm:text-2xl font-bold text-green-500">{viewingReport.positive_percent}%</p>
                  <p className="text-xs text-muted-foreground">Positive</p>
                </div>
                <div className="text-center">
                  <p className="text-lg sm:text-2xl font-bold text-red-500">{viewingReport.negative_percent}%</p>
                  <p className="text-xs text-muted-foreground">Negative</p>
                </div>
              </div>

              {viewingReport.summary && (
                <div className="p-3 bg-muted/30 rounded-lg">
                  <p className="text-sm font-medium mb-1">AI Summary</p>
                  <p className="text-sm text-muted-foreground">{viewingReport.summary}</p>
                </div>
              )}

              {/* Sources List */}
              <div>
                <p className="text-sm font-medium mb-2">
                  All Sources ({viewingReport.raw_results?.length || 0})
                </p>
                <ScrollArea className="h-[300px] sm:h-[400px] pr-2 sm:pr-4">
                  <div className="space-y-3">
                    {(viewingReport.raw_results || []).map((source, index) => (
                      <div 
                        key={index}
                        className="p-4 border rounded-lg bg-card hover:bg-accent/50 transition-colors"
                      >
                        <div className="flex items-start gap-3">
                          <Badge variant="outline" className="shrink-0">
                            {index + 1}
                          </Badge>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium text-sm line-clamp-2">
                              {source.title || 'Untitled'}
                            </h4>
                            {source.url && (
                              <a 
                                href={source.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-primary hover:underline flex items-center gap-1 mt-1"
                              >
                                <ExternalLink className="w-3 h-3" />
                                {source.url.length > 60 ? source.url.substring(0, 60) + '...' : source.url}
                              </a>
                            )}
                            {source.description && (
                              <p className="text-sm text-muted-foreground mt-2 line-clamp-3">
                                {source.description}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>

              {/* Download Actions */}
              <div className="flex gap-2 pt-2 border-t">
                <Button 
                  variant="outline" 
                  className="flex-1"
                  onClick={() => handleDownloadPDF(viewingReport)}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download PDF
                </Button>
                <Button 
                  variant="outline" 
                  className="flex-1"
                  onClick={() => handleDownloadCSV(viewingReport)}
                >
                  <FileText className="w-4 h-4 mr-2" />
                  Download CSV
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BrandStrategy;
