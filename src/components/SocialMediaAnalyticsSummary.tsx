import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, Zap, TrendingUp, BarChart3, Facebook, Instagram, Linkedin, Twitter, Youtube, Music, ExternalLink } from "lucide-react";

interface PlatformData {
  platform: string;
  connected: boolean;
  followers?: number;
  impressions?: number;
  engagement?: number;
  analyticsRoute?: string;
}

interface SocialMediaAnalyticsSummaryProps {
  detailed?: boolean;
  showFullButton?: boolean;
  onFullClick?: () => void;
}

const platformIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  youtube: Youtube,
  facebook: Facebook,
  instagram: Instagram,
  linkedin: Linkedin,
  twitter: Twitter,
  tiktok: Music,
};

const platformColors: Record<string, string> = {
  youtube: "bg-red-600",
  facebook: "bg-blue-600",
  instagram: "bg-gradient-to-br from-purple-600 via-pink-500 to-orange-400",
  linkedin: "bg-blue-700",
  twitter: "bg-gray-800",
  tiktok: "bg-black",
};

const platformRoutes: Record<string, string> = {
  youtube: "/profile/youtube-analytics",
  facebook: "/profile/facebook-analytics",
  instagram: "/profile/instagram-analytics",
  linkedin: "/profile/linkedin-analytics",
  twitter: "/profile/twitter-analytics",
  tiktok: "/profile/tiktok-analytics",
};

export function SocialMediaAnalyticsSummary({ 
  detailed = false, 
  showFullButton = false,
  onFullClick
}: SocialMediaAnalyticsSummaryProps) {
  const navigate = useNavigate();
  const [connectedPlatforms, setConnectedPlatforms] = useState<PlatformData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadConnectedPlatforms();
  }, []);

  const loadConnectedPlatforms = async () => {
    try {
      const { data: connections } = await supabase
        .from('social_connections')
        .select('platform');

      const platforms = ['youtube', 'facebook', 'instagram', 'linkedin', 'twitter', 'tiktok'];
      const connectedSet = new Set(connections?.map(c => c.platform) || []);

      const platformData = platforms.map(platform => ({
        platform,
        connected: connectedSet.has(platform),
        analyticsRoute: platformRoutes[platform],
      }));

      setConnectedPlatforms(platformData);
    } catch (error) {
      console.error('Error loading platforms:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const stats = [
    { label: "Total Impressions", icon: Users, value: "--", color: "primary" },
    { label: "Total Clicks", icon: Zap, value: "--", color: "blue" },
    { label: "Total Conversions", icon: TrendingUp, value: "--", color: "green" },
    { label: "Avg ROAS", icon: BarChart3, value: "--", color: "purple" },
  ];

  const colorClasses: Record<string, string> = {
    primary: "bg-primary/10 text-primary",
    blue: "bg-blue-500/10 text-blue-500",
    green: "bg-green-500/10 text-green-500",
    purple: "bg-purple-500/10 text-purple-500",
  };

  if (detailed) {
    return (
      <div className="space-y-6">
        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {stats.map((stat) => (
            <Card key={stat.label}>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${colorClasses[stat.color]}`}>
                    <stat.icon className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stat.value}</p>
                    <p className="text-xs text-muted-foreground">{stat.label}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Platform Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>Platform Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {connectedPlatforms.map((platform) => {
                const Icon = platformIcons[platform.platform] || Users;
                return (
                  <div
                    key={platform.platform}
                    className={`p-4 rounded-lg border ${
                      platform.connected 
                        ? 'border-border bg-card' 
                        : 'border-dashed border-muted-foreground/30 bg-muted/20'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className={`w-8 h-8 rounded-lg ${platformColors[platform.platform]} flex items-center justify-center`}>
                          <Icon className="w-4 h-4 text-white" />
                        </div>
                        <span className="font-medium capitalize">{platform.platform}</span>
                      </div>
                      {platform.connected && platform.analyticsRoute && (
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => navigate(platform.analyticsRoute!)}
                        >
                          <ExternalLink className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                    {platform.connected ? (
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Impressions</span>
                          <span className="font-medium">--</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Engagement</span>
                          <span className="font-medium">--</span>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">Not connected</p>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Compact version for homepage
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-base sm:text-lg flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-primary" />
          Social Media Analytics
        </CardTitle>
        {showFullButton && (
          <Button variant="outline" size="sm" onClick={onFullClick} className="gap-1.5">
            <ExternalLink className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Full Analytics</span>
          </Button>
        )}
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {stats.map((stat) => (
            <div key={stat.label} className="p-3 rounded-lg bg-muted/50">
              <div className="flex items-center gap-2 mb-1">
                <stat.icon className={`w-4 h-4 ${colorClasses[stat.color].split(' ')[1]}`} />
                <span className="text-xs text-muted-foreground truncate">{stat.label}</span>
              </div>
              <p className="text-xl sm:text-2xl font-bold">{stat.value}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
