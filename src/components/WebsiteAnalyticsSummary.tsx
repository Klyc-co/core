import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Globe, Eye, Users, Clock, TrendingDown, ExternalLink, Loader2, Link2 } from "lucide-react";
import { toast } from "sonner";

interface WebsiteAnalyticsSummaryProps {
  showFullButton?: boolean;
  onFullClick?: () => void;
  onConnectClick?: () => void;
}

interface QuickMetrics {
  pageviews: number;
  visitors: number;
  avgDuration: number;
  bounceRate: number;
}

export function WebsiteAnalyticsSummary({ 
  showFullButton = false, 
  onFullClick,
  onConnectClick 
}: WebsiteAnalyticsSummaryProps) {
  const [isConnected, setIsConnected] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [metrics, setMetrics] = useState<QuickMetrics | null>(null);

  useEffect(() => {
    checkConnection();
  }, []);

  const checkConnection = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Use maybeSingle() instead of single() to avoid 406 error when no rows exist
    const { data } = await supabase
      .from('social_connections')
      .select('id')
      .eq('platform', 'google_analytics')
      .eq('user_id', user.id)
      .maybeSingle();

    setIsConnected(!!data);

    if (data) {
      fetchQuickMetrics();
    }
  };

  const fetchQuickMetrics = async () => {
    setIsLoading(true);
    try {
      // First get properties to find the first one
      const { data: propsData } = await supabase.functions.invoke('google-analytics-data', {
        body: { action: 'listProperties' }
      });

      if (propsData?.properties?.length > 0) {
        const propertyId = propsData.properties[0].propertyId;
        
        const { data } = await supabase.functions.invoke('google-analytics-data', {
          body: {
            action: 'getData',
            propertyId,
            startDate: '7daysAgo',
            endDate: 'today'
          }
        });

        if (data?.metrics) {
          setMetrics({
            pageviews: data.metrics.pageviews,
            visitors: data.metrics.uniqueVisitors,
            avgDuration: data.metrics.avgSessionDuration,
            bounceRate: data.metrics.bounceRate,
          });
        }
      }
    } catch (error) {
      console.error('Error fetching quick metrics:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}m ${secs}s`;
  };

  if (isConnected === null) {
    return (
      <Card>
        <CardContent className="p-6 flex items-center justify-center">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!isConnected) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-base sm:text-lg flex items-center gap-2">
            <Globe className="w-5 h-5 text-primary" />
            Website Analytics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">
            <Globe className="w-10 h-10 mx-auto text-muted-foreground/50 mb-3" />
            <p className="text-sm text-muted-foreground mb-3">
              Connect Google Analytics to view website metrics
            </p>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={onConnectClick}
              className="gap-1.5"
            >
              <Link2 className="w-3.5 h-3.5" />
              Connect
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const stats = [
    { 
      label: "Pageviews", 
      icon: Eye, 
      value: metrics ? metrics.pageviews.toLocaleString() : "--",
      color: "primary" 
    },
    { 
      label: "Visitors", 
      icon: Users, 
      value: metrics ? metrics.visitors.toLocaleString() : "--",
      color: "blue" 
    },
    { 
      label: "Avg. Duration", 
      icon: Clock, 
      value: metrics ? formatDuration(metrics.avgDuration) : "--",
      color: "green" 
    },
    { 
      label: "Bounce Rate", 
      icon: TrendingDown, 
      value: metrics ? `${metrics.bounceRate.toFixed(1)}%` : "--",
      color: "orange" 
    },
  ];

  const colorClasses: Record<string, string> = {
    primary: "text-primary",
    blue: "text-blue-500",
    green: "text-green-500",
    orange: "text-orange-500",
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-base sm:text-lg flex items-center gap-2">
          <Globe className="w-5 h-5 text-primary" />
          Website Analytics
        </CardTitle>
        {showFullButton && (
          <Button variant="outline" size="sm" onClick={onFullClick} className="gap-1.5">
            <ExternalLink className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Full Analytics</span>
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {stats.map((stat) => (
              <div key={stat.label} className="p-3 rounded-lg bg-muted/50">
                <div className="flex items-center gap-2 mb-1">
                  <stat.icon className={`w-4 h-4 ${colorClasses[stat.color]}`} />
                  <span className="text-xs text-muted-foreground truncate">{stat.label}</span>
                </div>
                <p className="text-xl sm:text-2xl font-bold">{stat.value}</p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
