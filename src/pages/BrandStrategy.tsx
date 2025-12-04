import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  ArrowLeft, 
  Globe, 
  Calendar, 
  Clock, 
  FileText, 
  Download, 
  BarChart3,
  Zap,
  Loader2,
  Play
} from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
}

const timeSlots = [
  "06:00", "07:00", "08:00", "09:00", "10:00", "11:00", 
  "12:00", "13:00", "14:00", "15:00", "16:00", "17:00", "18:00"
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
  
  const [user, setUser] = useState<User | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [scheduledDate, setScheduledDate] = useState<Date | undefined>();
  const [scheduledTime, setScheduledTime] = useState("08:00");
  const [isScheduling, setIsScheduling] = useState(false);
  const [isRunningNow, setIsRunningNow] = useState(false);
  
  const [scheduledReports, setScheduledReports] = useState<ScheduledReport[]>([]);
  const [reportResults, setReportResults] = useState<ReportResult[]>([]);
  const [loading, setLoading] = useState(true);

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
    setReportResults(results || []);
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
      
      toast({ title: "Search scheduled!", description: `"${searchTerm}" will run daily at ${scheduledTime}` });
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

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card/50 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <button
            onClick={() => navigate("/home")}
            className="flex items-center gap-2 text-primary hover:text-primary/80 text-sm mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </button>
          <h1 className="text-2xl font-bold text-foreground">Brand Strategy</h1>
          <p className="text-muted-foreground mt-1">
            AI-powered brand and market intelligence for creative, audience, and SEO strategy.
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex gap-8">
          {/* Left Sidebar - Strategy Modules */}
          <div className="w-64 flex-shrink-0">
            <h2 className="text-sm font-semibold text-foreground mb-4">Strategy Modules</h2>
            <nav className="space-y-1">
              <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg bg-primary/10 text-primary border-l-2 border-primary">
                <BarChart3 className="w-4 h-4" />
                <div className="text-left">
                  <div className="text-sm font-medium">Run Report</div>
                  <div className="text-xs text-muted-foreground">Schedule and run web reports</div>
                </div>
              </button>
            </nav>
          </div>

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

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-foreground flex items-center gap-2 mb-2">
                        <Clock className="w-4 h-4" />
                        Schedule Time (Daily)
                      </label>
                      <Select value={scheduledTime} onValueChange={setScheduledTime}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select time" />
                        </SelectTrigger>
                        <SelectContent>
                          {timeSlots.map((time) => (
                            <SelectItem key={time} value={time}>
                              {time}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
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

                          <div className="grid grid-cols-4 gap-4 mb-4">
                            <div>
                              <p className="text-xs text-muted-foreground">Mentions</p>
                              <p className="text-xl font-bold text-foreground">{report.mentions.toLocaleString()}</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Sources</p>
                              <p className="text-xl font-bold text-foreground">{report.sources}</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Positive</p>
                              <p className="text-xl font-bold text-green-500">{report.positive_percent}%</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Negative</p>
                              <p className="text-xl font-bold text-red-500">{report.negative_percent}%</p>
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
                            <div className="flex text-xs mt-1 gap-4">
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

                          <div className="flex gap-2">
                            <Button variant="outline" size="sm" className="flex-1">
                              <Download className="w-4 h-4 mr-2" />
                              PDF
                            </Button>
                            <Button variant="outline" size="sm" className="flex-1">
                              <FileText className="w-4 h-4 mr-2" />
                              CSV
                            </Button>
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
                  <Zap className="w-5 h-5" />
                  Quick Schedule Templates
                </h3>
                <div className="grid grid-cols-3 gap-4">
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
                              Daily at {report.schedule_time}
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
    </div>
  );
};

export default BrandStrategy;
