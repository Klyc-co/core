import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import ClientHeader from "@/components/ClientHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Pencil, 
  Download, 
  BarChart3, 
  Globe, 
  Building2, 
  CheckCircle2,
  TrendingUp,
  FileText,
  Palette
} from "lucide-react";
import type { User } from "@supabase/supabase-js";

interface SocialConnection {
  platform: string;
  platform_username: string | null;
}

interface QuickStat {
  label: string;
  value: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
}

const ClientProfile = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [socialConnections, setSocialConnections] = useState<SocialConnection[]>([]);
  const [hasGoogleDrive, setHasGoogleDrive] = useState(false);
  const [brandAssetCount, setBrandAssetCount] = useState(0);
  const [campaignDraftCount, setCampaignDraftCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/client/auth");
        return;
      }
      setUser(user);

      // Fetch profile data
      const { data: profileData } = await supabase
        .from("client_profiles")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
      
      setProfile(profileData);

      // Fetch social connections
      const { data: connections } = await supabase
        .from("social_connections")
        .select("platform, platform_username")
        .eq("user_id", user.id);
      
      setSocialConnections(connections || []);

      // Check for Google Drive connection
      const { data: driveConn } = await supabase
        .from("google_drive_connections")
        .select("id, connection_status")
        .eq("user_id", user.id)
        .eq("connection_status", "connected")
        .maybeSingle();
      
      setHasGoogleDrive(!!driveConn);

      // Fetch brand asset count
      const { count: assetCount } = await supabase
        .from("brand_assets")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id);
      
      setBrandAssetCount(assetCount || 0);

      // Fetch campaign draft count
      const { count: draftCount } = await supabase
        .from("campaign_drafts")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id);
      
      setCampaignDraftCount(draftCount || 0);

      setLoading(false);
    };

    fetchData();
  }, [navigate]);

  const businessName = profile?.business_name || "Your Business";
  const website = profile?.website || "Not set";
  const logoUrl = profile?.logo_url;

  const platformLabels: Record<string, string> = {
    tiktok: "TikTok",
    instagram: "Instagram",
    youtube: "YouTube",
    facebook: "Facebook",
    twitter: "Twitter/X",
    linkedin: "LinkedIn",
    google_analytics: "Google Analytics",
    google_drive: "Google Drive",
  };

  // Combine social connections with Google Drive for display
  const allConnections = [
    ...socialConnections,
    ...(hasGoogleDrive ? [{ platform: "google_drive", platform_username: null }] : []),
  ];

  const connectedPlatformCount = allConnections.length;

  const quickStats: QuickStat[] = [
    {
      label: "Connected Platforms",
      value: connectedPlatformCount.toString(),
      icon: <TrendingUp className="w-5 h-5" />,
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      label: "Brand Assets",
      value: brandAssetCount.toString(),
      icon: <Palette className="w-5 h-5" />,
      color: "text-purple-500",
      bgColor: "bg-purple-500/10",
    },
    {
      label: "Campaign Drafts",
      value: campaignDraftCount.toString(),
      icon: <FileText className="w-5 h-5" />,
      color: "text-blue-500",
      bgColor: "bg-blue-500/10",
    },
    {
      label: "Profile Completion",
      value: profile ? (profile.business_name && profile.industry && profile.target_audience ? "100%" : profile.business_name ? "50%" : "25%") : "0%",
      icon: <CheckCircle2 className="w-5 h-5" />,
      color: "text-green-500",
      bgColor: "bg-green-500/10",
    },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <ClientHeader user={user} />
        <main className="max-w-4xl mx-auto px-4 py-12">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-muted rounded w-1/3"></div>
            <div className="h-4 bg-muted rounded w-1/4"></div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <ClientHeader user={user} />
      
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-12">
        {/* Header Section with Logo */}
        <div className="flex flex-col sm:flex-row gap-6 mb-8">
          {/* Logo */}
          <div className="flex-shrink-0">
            <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-xl bg-muted border-2 border-dashed border-border flex items-center justify-center overflow-hidden">
              {logoUrl ? (
                <img src={logoUrl} alt={businessName} className="w-full h-full object-cover" />
              ) : (
                <Building2 className="w-10 h-10 text-muted-foreground" />
              )}
            </div>
          </div>

          {/* Business Info */}
          <div className="flex-1 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-1">
                {businessName}
              </h1>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Globe className="w-4 h-4" />
                <span className="text-sm">{website}</span>
              </div>
            </div>
            
            <Button 
              onClick={() => navigate("/client/profile/company")}
              variant="outline"
              className="gap-2 self-start"
            >
              <Pencil className="w-4 h-4" />
              Edit Profile
            </Button>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          <Button 
            onClick={() => navigate("/client/profile/import")}
            variant="outline"
            className="flex-1 gap-2 h-12"
          >
            <Download className="w-4 h-4" />
            Import Brand Sources
          </Button>
          
          <Button 
            onClick={() => navigate("/client/insights")}
            className="flex-1 gap-2 h-12"
          >
            <BarChart3 className="w-4 h-4" />
            Full Analytics
          </Button>
        </div>

        {/* Platforms Connected - Always visible */}
        <Card className="bg-card border-border mb-8">
          <CardContent className="p-6">
            <h2 className="text-lg font-semibold text-foreground mb-4">Platforms Connected</h2>
            {allConnections.length > 0 ? (
              <div className="flex flex-wrap gap-3">
                {allConnections.map((conn) => (
                  <div 
                    key={conn.platform}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-green-500/5 border border-green-500/20"
                  >
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                    <span className="text-sm text-foreground">
                      {platformLabels[conn.platform.toLowerCase()] || conn.platform}
                    </span>
                    {conn.platform_username && (
                      <span className="text-xs text-muted-foreground">
                        @{conn.platform_username}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-16 flex items-center justify-center border-2 border-dashed border-border rounded-lg">
                <p className="text-sm text-muted-foreground">
                  No platforms connected yet. Import brand sources to get started.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {quickStats.map((stat) => (
            <Card key={stat.label} className="bg-card border-border">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg ${stat.bgColor} ${stat.color} flex items-center justify-center`}>
                    {stat.icon}
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                    <p className="text-xs text-muted-foreground">{stat.label}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </main>
    </div>
  );
};

export default ClientProfile;
