import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, LogIn, CheckCircle2, BarChart3, DollarSign, Eye, MousePointerClick, TrendingUp } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface AdPlatform {
  id: string;
  name: string;
  icon: string;
  color: string;
  connected: boolean;
  connectPath: string;
}

export default function PaidAdsDashboard() {
  const { toast } = useToast();
  const [platforms, setPlatforms] = useState<AdPlatform[]>([
    {
      id: "facebook",
      name: "Facebook / Meta Ads",
      icon: "📘",
      color: "from-blue-600 to-blue-700",
      connected: false,
      connectPath: "/profile/import",
    },
    {
      id: "google",
      name: "Google Ads",
      icon: "🔍",
      color: "from-green-500 to-emerald-600",
      connected: false,
      connectPath: "/profile/import",
    },
  ]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkConnections();
  }, []);

  const checkConnections = async () => {
    try {
      const { data: connections } = await supabase
        .from("social_connections")
        .select("platform");

      const connectedSet = new Set(
        connections?.map((c) => c.platform.toLowerCase()) || []
      );

      setPlatforms((prev) =>
        prev.map((p) => ({
          ...p,
          connected:
            p.id === "facebook"
              ? connectedSet.has("facebook") || connectedSet.has("meta")
              : connectedSet.has("google"),
        }))
      );
    } catch (err) {
      console.error("Error checking ad connections:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = (platform: AdPlatform) => {
    window.open(platform.connectPath, "_self");
  };

  const placeholderStats = [
    { label: "Impressions", icon: Eye, value: "--" },
    { label: "Clicks", icon: MousePointerClick, value: "--" },
    { label: "Spend", icon: DollarSign, value: "--" },
    { label: "Conversions", icon: TrendingUp, value: "--" },
  ];

  return (
    <div className="space-y-6 mt-6">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <BarChart3 className="w-5 h-5 text-primary" />
            Paid Ads Manager
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Connect your ad accounts to manage campaigns and track performance
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {platforms.map((platform) => (
            <div
              key={platform.id}
              className="rounded-xl border border-border p-5 space-y-4"
            >
              {/* Platform header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-lg bg-gradient-to-br ${platform.color} flex items-center justify-center text-xl`}
                  >
                    {platform.icon}
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">
                      {platform.name}
                    </h3>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      {platform.connected ? (
                        <Badge
                          variant="outline"
                          className="text-[10px] bg-green-500/10 text-green-500 border-green-500/20"
                        >
                          <CheckCircle2 className="w-3 h-3 mr-1" />
                          Connected
                        </Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          className="text-[10px] text-muted-foreground"
                        >
                          Not Connected
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>

                {platform.connected ? (
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5"
                    onClick={() =>
                      toast({
                        title: "Coming Soon",
                        description: `${platform.name} dashboard is under development.`,
                      })
                    }
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    Open Dashboard
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    className="gap-1.5"
                    onClick={() => handleConnect(platform)}
                  >
                    <LogIn className="w-3.5 h-3.5" />
                    Connect
                  </Button>
                )}
              </div>

              {/* Stats row */}
              <div className="grid grid-cols-4 gap-3">
                {placeholderStats.map((stat) => (
                  <div
                    key={stat.label}
                    className="rounded-lg bg-muted/50 p-3 text-center"
                  >
                    <stat.icon className="w-4 h-4 text-muted-foreground mx-auto mb-1" />
                    <p className="text-lg font-bold text-foreground">
                      {stat.value}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {stat.label}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground text-center">
        Connect your ad accounts above to see real-time spend, impressions, and
        conversion data.
      </p>
    </div>
  );
}
