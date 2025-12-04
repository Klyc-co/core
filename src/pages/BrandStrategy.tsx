import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  Trash2,
  Loader2
} from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";

interface ScheduledSearch {
  id: string;
  term: string;
  scheduledDate: Date;
  scheduledTime: string;
}

interface Report {
  id: string;
  title: string;
  generatedDate: string;
  sentiment: "Positive" | "Mixed" | "Negative";
  mentions: number;
  sources: number;
  engagement: string;
  weekChange: string;
  sentimentBreakdown: {
    positive: number;
    neutral: number;
    negative: number;
  };
}

const timeSlots = [
  "08:00", "09:00", "10:00", "11:00", "12:00", 
  "13:00", "14:00", "15:00", "16:00", "17:00", "18:00"
];

const quickTemplates = [
  {
    title: "Weekly Competitor Overview",
    description: "Monitor competitor activity",
    schedule: "Every Monday 9am"
  },
  {
    title: "Monthly Sentiment Tracker",
    description: "Track brand sentiment trends",
    schedule: "First day of month"
  },
  {
    title: "Daily Brand Mentions",
    description: "Immediate brand monitoring",
    schedule: "Daily at 8am"
  }
];

const BrandStrategy = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [searchTerm, setSearchTerm] = useState("");
  const [scheduledDate, setScheduledDate] = useState<Date | undefined>();
  const [scheduledTime, setScheduledTime] = useState("");
  const [isScheduling, setIsScheduling] = useState(false);
  
  const [scheduledSearches, setScheduledSearches] = useState<ScheduledSearch[]>([
    { id: "1", term: "AI marketing trends", scheduledDate: new Date("2024-01-19"), scheduledTime: "09:00" },
    { id: "2", term: "competitor campaign analysis", scheduledDate: new Date("2024-01-20"), scheduledTime: "14:00" }
  ]);
  
  const [reports] = useState<Report[]>([
    {
      id: "1",
      title: "Product launch campaign",
      generatedDate: "1/17/2024",
      sentiment: "Positive",
      mentions: 2847,
      sources: 124,
      engagement: "18.5%",
      weekChange: "+18%",
      sentimentBreakdown: { positive: 65, neutral: 22, negative: 13 }
    },
    {
      id: "2",
      title: "Brand sentiment analysis",
      generatedDate: "1/17/2024",
      sentiment: "Mixed",
      mentions: 1562,
      sources: 87,
      engagement: "12.3%",
      weekChange: "+18%",
      sentimentBreakdown: { positive: 65, neutral: 22, negative: 13 }
    }
  ]);

  const handleScheduleSearch = async () => {
    if (!searchTerm || !scheduledDate || !scheduledTime) {
      toast({ title: "Missing fields", description: "Please fill in all fields", variant: "destructive" });
      return;
    }
    
    setIsScheduling(true);
    
    // Simulate scheduling
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const newSearch: ScheduledSearch = {
      id: Date.now().toString(),
      term: searchTerm,
      scheduledDate,
      scheduledTime
    };
    
    setScheduledSearches([...scheduledSearches, newSearch]);
    setSearchTerm("");
    setScheduledDate(undefined);
    setScheduledTime("");
    setIsScheduling(false);
    
    toast({ title: "Search scheduled", description: `"${searchTerm}" will run on ${format(scheduledDate, "MM/dd/yyyy")} at ${scheduledTime}` });
  };

  const handleRemoveSearch = (id: string) => {
    setScheduledSearches(scheduledSearches.filter(s => s.id !== id));
    toast({ title: "Search removed", description: "Scheduled search has been cancelled" });
  };

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case "Positive": return "bg-green-100 text-green-700 border-green-200";
      case "Mixed": return "bg-yellow-100 text-yellow-700 border-yellow-200";
      case "Negative": return "bg-red-100 text-red-700 border-red-200";
      default: return "bg-muted text-muted-foreground";
    }
  };

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
                        <Calendar className="w-4 h-4" />
                        Schedule Date
                      </label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" className="w-full justify-start text-left font-normal">
                            {scheduledDate ? format(scheduledDate, "MM/dd/yyyy") : "mm/dd/yyyy"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <CalendarComponent
                            mode="single"
                            selected={scheduledDate}
                            onSelect={setScheduledDate}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    </div>

                    <div>
                      <label className="text-sm font-medium text-foreground flex items-center gap-2 mb-2">
                        <Clock className="w-4 h-4" />
                        Time
                      </label>
                      <Select value={scheduledTime} onValueChange={setScheduledTime}>
                        <SelectTrigger>
                          <SelectValue placeholder="--:-- --" />
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
                  </div>

                  <Button 
                    className="w-full" 
                    onClick={handleScheduleSearch}
                    disabled={isScheduling}
                  >
                    {isScheduling ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Clock className="w-4 h-4 mr-2" />
                    )}
                    Schedule Search
                  </Button>
                </CardContent>
              </Card>

              {/* Current Reports */}
              <div className="mb-8">
                <h3 className="text-lg font-semibold text-foreground flex items-center gap-2 mb-4">
                  <FileText className="w-5 h-5" />
                  Current Reports
                </h3>
                <div className="space-y-4">
                  {reports.map((report) => (
                    <Card key={report.id}>
                      <CardContent className="pt-6">
                        <div className="flex items-start justify-between mb-4">
                          <div>
                            <h4 className="font-semibold text-foreground">{report.title}</h4>
                            <p className="text-sm text-muted-foreground flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              Generated on {report.generatedDate}
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
                            <p className="text-xs text-muted-foreground">Engagement</p>
                            <p className="text-xl font-bold text-foreground">{report.engagement}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Week Change</p>
                            <p className="text-xl font-bold text-green-500">{report.weekChange}</p>
                          </div>
                        </div>

                        <div className="mb-4">
                          <p className="text-sm font-medium text-foreground mb-2">Sentiment Breakdown</p>
                          <div className="flex h-2 rounded-full overflow-hidden">
                            <div 
                              className="bg-green-500" 
                              style={{ width: `${report.sentimentBreakdown.positive}%` }}
                            />
                            <div 
                              className="bg-yellow-500" 
                              style={{ width: `${report.sentimentBreakdown.neutral}%` }}
                            />
                            <div 
                              className="bg-red-500" 
                              style={{ width: `${report.sentimentBreakdown.negative}%` }}
                            />
                          </div>
                          <div className="flex text-xs mt-1 gap-4">
                            <span className="text-green-500">{report.sentimentBreakdown.positive}% Positive</span>
                            <span className="text-yellow-500">{report.sentimentBreakdown.neutral}% Neutral</span>
                            <span className="text-red-500">{report.sentimentBreakdown.negative}% Negative</span>
                          </div>
                        </div>

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
                        <Button variant="outline" size="sm" className="w-full">
                          Add Template
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>

              {/* Scheduled Searches */}
              <div>
                <h3 className="text-lg font-semibold text-foreground mb-4">Scheduled Searches</h3>
                <div className="space-y-2">
                  {scheduledSearches.map((search) => (
                    <Card key={search.id}>
                      <CardContent className="py-3 flex items-center justify-between">
                        <div>
                          <p className="font-medium text-foreground">{search.term}</p>
                          <p className="text-sm text-muted-foreground flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {format(search.scheduledDate, "M/d/yyyy")} at {search.scheduledTime}
                          </p>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="text-red-500 hover:text-red-600 hover:bg-red-50"
                          onClick={() => handleRemoveSearch(search.id)}
                        >
                          Remove
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BrandStrategy;
