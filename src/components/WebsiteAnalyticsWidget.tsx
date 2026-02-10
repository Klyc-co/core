import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, ExternalLink, TrendingUp, Users, Clock, MousePointer, ArrowUpRight, ArrowDownRight, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

interface AnalyticsMetrics {
  pageviews: number;
  uniqueVisitors: number;
  sessions: number;
  bounceRate: number;
  avgSessionDuration: number;
  newUsers: number;
  returningUsers: number;
}

interface TrafficSource {
  source: string;
  sessions: number;
  percentage: number;
}

interface TopPage {
  path: string;
  title: string;
  pageviews: number;
  avgTimeOnPage: number;
}

interface DailyData {
  date: string;
  pageviews: number;
  sessions: number;
  users: number;
}

interface GAProperty {
  propertyId: string;
  displayName: string;
}

const CHART_COLORS = ['hsl(var(--primary))', 'hsl(var(--secondary))', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899'];

const dateRangeOptions = [
  { value: '7daysAgo', label: 'Last 7 Days' },
  { value: '14daysAgo', label: 'Last 14 Days' },
  { value: '30daysAgo', label: 'Last 30 Days' },
  { value: '90daysAgo', label: 'Last 90 Days' },
];

export function WebsiteAnalyticsWidget() {
  const [isConnected, setIsConnected] = useState<boolean | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [properties, setProperties] = useState<GAProperty[]>([]);
  const [selectedProperty, setSelectedProperty] = useState<string>("");
  const [dateRange, setDateRange] = useState("30daysAgo");
  const [metrics, setMetrics] = useState<AnalyticsMetrics | null>(null);
  const [trafficSources, setTrafficSources] = useState<TrafficSource[]>([]);
  const [topPages, setTopPages] = useState<TopPage[]>([]);
  const [dailyData, setDailyData] = useState<DailyData[]>([]);

  // Check connection status on mount
  useEffect(() => {
    checkConnection();
  }, []);

  const checkConnection = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from('social_connections')
      .select('id')
      .eq('platform', 'google_analytics')
      .single();

    setIsConnected(!!data);

    if (data) {
      loadProperties();
    }
  };

  const loadProperties = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('google-analytics-data', {
        body: { action: 'listProperties' }
      });

      if (error) throw error;
      
      setProperties(data.properties || []);
      if (data.properties?.length > 0) {
        setSelectedProperty(data.properties[0].propertyId);
      }
    } catch (error) {
      console.error('Failed to load properties:', error);
      toast.error('Failed to load Google Analytics properties');
    }
  };

  const connectGoogleAnalytics = async () => {
    setIsConnecting(true);
    try {
      const redirectUri = `${window.location.origin}/profile/company`;
      
      const { data, error } = await supabase.functions.invoke('google-analytics-auth-url', {
        body: { redirectUri }
      });

      if (error) throw error;

      // Store state in localStorage for cross-window access
      localStorage.setItem('ga_oauth_state', data.state);
      localStorage.setItem('ga_oauth_started_at', String(Date.now()));
      
      // Use popup window to avoid iframe restrictions
      const width = 600;
      const height = 700;
      const left = window.screenX + (window.outerWidth - width) / 2;
      const top = window.screenY + (window.outerHeight - height) / 2;
      
      const popup = window.open(
        data.url,
        'google_analytics_oauth',
        `width=${width},height=${height},left=${left},top=${top},toolbar=no,menubar=no`
      );
      
      if (!popup) {
        const fallback = window.open(data.url, '_blank');
        if (!fallback) {
          toast.error('Please allow popups for this site to connect Google Analytics');
          setIsConnecting(false);
        }
      }
    } catch (error) {
      console.error('Failed to start OAuth:', error);
      toast.error('Failed to connect Google Analytics');
      setIsConnecting(false);
    }
  };

  // Handle OAuth callback
  useEffect(() => {
    const handleCallback = async () => {
      const params = new URLSearchParams(window.location.search);
      const code = params.get('code');
      const state = params.get('state');
      const storedState = sessionStorage.getItem('ga_oauth_state');

      if (code && state && storedState === state) {
        sessionStorage.removeItem('ga_oauth_state');
        
        // Clear URL params
        window.history.replaceState({}, '', window.location.pathname);
        
        try {
          const { data, error } = await supabase.functions.invoke('google-analytics-oauth-callback', {
            body: {
              code,
              redirectUri: `${window.location.origin}/profile/company`
            }
          });

          if (error) throw error;

          toast.success(`Connected to Google Analytics as ${data.email}`);
          setIsConnected(true);
          loadProperties();
        } catch (error) {
          console.error('OAuth callback error:', error);
          toast.error('Failed to complete Google Analytics connection');
        }
      }
    };

    handleCallback();
  }, []);

  const fetchAnalyticsData = useCallback(async () => {
    if (!selectedProperty) return;

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('google-analytics-data', {
        body: {
          action: 'getData',
          propertyId: selectedProperty,
          startDate: dateRange,
          endDate: 'today'
        }
      });

      if (error) throw error;

      setMetrics(data.metrics);
      setTrafficSources(data.trafficSources || []);
      setTopPages(data.topPages || []);
      setDailyData(data.dailyData || []);
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
      toast.error('Failed to load analytics data');
    } finally {
      setIsLoading(false);
    }
  }, [selectedProperty, dateRange]);

  // Fetch data when property or date range changes
  useEffect(() => {
    if (selectedProperty) {
      fetchAnalyticsData();
    }
  }, [selectedProperty, dateRange, fetchAnalyticsData]);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}m ${secs}s`;
  };

  const formatDate = (dateStr: string) => {
    // Format: YYYYMMDD -> MMM DD
    const year = dateStr.slice(0, 4);
    const month = dateStr.slice(4, 6);
    const day = dateStr.slice(6, 8);
    const date = new Date(`${year}-${month}-${day}`);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  if (isConnected === null) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!isConnected) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Website Analytics
          </CardTitle>
          <CardDescription>
            Connect your Google Analytics to view website performance metrics
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button 
            onClick={connectGoogleAnalytics} 
            disabled={isConnecting}
            className="gap-2"
          >
            {isConnecting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Connecting...
              </>
            ) : (
              <>
                <ExternalLink className="w-4 h-4" />
                Connect Google Analytics
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Controls */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                Website Analytics
              </CardTitle>
              <CardDescription>
                Performance metrics from Google Analytics
              </CardDescription>
            </div>
            <div className="flex items-center gap-3">
              {properties.length > 0 && (
                <Select value={selectedProperty} onValueChange={setSelectedProperty}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Select property" />
                  </SelectTrigger>
                  <SelectContent>
                    {properties.map((prop) => (
                      <SelectItem key={prop.propertyId} value={prop.propertyId}>
                        {prop.displayName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              <Select value={dateRange} onValueChange={setDateRange}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {dateRangeOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="icon"
                onClick={fetchAnalyticsData}
                disabled={isLoading}
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Metrics Grid */}
      {metrics && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <MetricCard
            title="Pageviews"
            value={metrics.pageviews.toLocaleString()}
            icon={<MousePointer className="w-4 h-4" />}
            color="primary"
          />
          <MetricCard
            title="Unique Visitors"
            value={metrics.uniqueVisitors.toLocaleString()}
            icon={<Users className="w-4 h-4" />}
            color="secondary"
          />
          <MetricCard
            title="Avg. Session Duration"
            value={formatDuration(metrics.avgSessionDuration)}
            icon={<Clock className="w-4 h-4" />}
            color="accent"
          />
          <MetricCard
            title="Bounce Rate"
            value={`${metrics.bounceRate.toFixed(1)}%`}
            icon={metrics.bounceRate > 50 ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
            color={metrics.bounceRate > 50 ? "destructive" : "success"}
          />
        </div>
      )}

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pageviews Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Pageviews Over Time</CardTitle>
          </CardHeader>
          <CardContent>
            {dailyData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={dailyData.map(d => ({ ...d, date: formatDate(d.date) }))}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="date" className="text-xs" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                  <YAxis className="text-xs" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }} 
                  />
                  <Line 
                    type="monotone" 
                    dataKey="pageviews" 
                    stroke="hsl(var(--primary))" 
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                {isLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : 'No data available'}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Traffic Sources */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Traffic Sources</CardTitle>
          </CardHeader>
          <CardContent>
            {trafficSources.length > 0 ? (
              <div className="flex items-center gap-8">
                <ResponsiveContainer width="50%" height={200}>
                  <PieChart>
                    <Pie
                      data={trafficSources}
                      dataKey="sessions"
                      nameKey="source"
                      cx="50%"
                      cy="50%"
                      outerRadius={70}
                      innerRadius={40}
                    >
                      {trafficSources.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex-1 space-y-2">
                  {trafficSources.slice(0, 5).map((source, index) => (
                    <div key={source.source} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }}
                        />
                        <span className="truncate max-w-[100px]">{source.source}</span>
                      </div>
                      <span className="text-muted-foreground">{source.percentage.toFixed(1)}%</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="h-[200px] flex items-center justify-center text-muted-foreground">
                {isLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : 'No data available'}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Top Pages */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Top Pages</CardTitle>
        </CardHeader>
        <CardContent>
          {topPages.length > 0 ? (
            <div className="space-y-3">
              {topPages.map((page) => (
                <div key={page.path} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                  <div className="flex-1 min-w-0 mr-4">
                    <p className="font-medium text-sm truncate">{page.title || page.path}</p>
                    <p className="text-xs text-muted-foreground truncate">{page.path}</p>
                  </div>
                  <div className="flex items-center gap-6 text-sm">
                    <div className="text-right">
                      <p className="font-medium">{page.pageviews.toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground">views</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">{formatDuration(page.avgTimeOnPage)}</p>
                      <p className="text-xs text-muted-foreground">avg. time</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center text-muted-foreground">
              {isLoading ? <Loader2 className="w-6 h-6 animate-spin mx-auto" /> : 'No data available'}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

interface MetricCardProps {
  title: string;
  value: string;
  icon: React.ReactNode;
  color: "primary" | "secondary" | "accent" | "destructive" | "success";
}

function MetricCard({ title, value, icon, color }: MetricCardProps) {
  const colorClasses = {
    primary: "bg-primary/10 text-primary",
    secondary: "bg-secondary text-secondary-foreground",
    accent: "bg-accent text-accent-foreground",
    destructive: "bg-destructive/10 text-destructive",
    success: "bg-green-500/10 text-green-600 dark:text-green-400",
  };

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${colorClasses[color]}`}>
            {icon}
          </div>
          <div>
            <p className="text-2xl font-bold">{value}</p>
            <p className="text-xs text-muted-foreground">{title}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
