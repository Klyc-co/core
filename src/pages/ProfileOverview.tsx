import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import AppHeader from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Pencil, 
  Download, 
  BarChart3, 
  Globe, 
  Building2, 
  CheckCircle2,
  Eye,
  Users,
  Heart,
  TrendingUp,
  FileText,
  Palette
} from "lucide-react";
import type { User } from "@supabase/supabase-js";
import { useClientContext } from "@/contexts/ClientContext";

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

const ProfileOverview = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [socialConnections, setSocialConnections] = useState<SocialConnection[]>([]);
  const [brandAssetCount, setBrandAssetCount] = useState(0);
  const [campaignDraftCount, setCampaignDraftCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const { selectedClientName, isDefaultClient, selectedClientId } = useClientContext();

  useEffect(() => {
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }
      setUser(user);

      const effectiveUserId = isDefaultClient ? user.id : selectedClientId;

      // Fetch profile data
      const { data: profileData } = await supabase
        .from("client_profiles")
        .select("*")
        .eq("user_id", effectiveUserId)
        .maybeSingle();
      
      setProfile(profileData);

      // Fetch social connections
      const { data: connections } = await supabase
        .from("social_connections")
        .select("platform, platform_username")
        .eq("user_id", effectiveUserId);
      
      setSocialConnections(connections || []);

      // Fetch brand asset count
      const { count: assetCount } = await supabase
        .from("brand_assets")
        .select("*", { count: "exact", head: true })
        .eq("user_id", effectiveUserId);
      
      setBrandAssetCount(assetCount || 0);

      // Fetch campaign draft count
      const { count: draftCount } = await supabase
        .from("campaign_drafts")
        .select("*", { count: "exact", head: true })
        .eq("user_id", effectiveUserId);
      
      setCampaignDraftCount(draftCount || 0);

      setLoading(false);
    };

    fetchData();
  }, [navigate, isDefaultClient, selectedClientId]);

  const displayName = isDefaultClient ? "My Business" : selectedClientName;
  const businessName = profile?.business_name || displayName || "Your Business";
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
  };

  const quickStats: QuickStat[] = [
    {
      label: "Connected Platforms",
      value: socialConnections.length.toString(),
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
        <AppHeader user={user} />
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
      <AppHeader user={user} />
      
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
              onClick={() => navigate("/profile/company")}
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
            onClick={() => navigate("/profile/import")}
            variant="outline"
            className="flex-1 gap-2 h-12"
          >
            <Download className="w-4 h-4" />
            Import Brand Sources
          </Button>
          
          <Button 
            onClick={() => navigate("/analytics")}
            className="flex-1 gap-2 h-12"
          >
            <BarChart3 className="w-4 h-4" />
            Full Analytics
          </Button>
        </div>

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

        {/* Connected Platforms - Only show if there are connections */}
        {socialConnections.length > 0 && (
          <Card className="bg-card border-border">
            <CardContent className="p-6">
              <h2 className="text-lg font-semibold text-foreground mb-4">Connected Platforms</h2>
              <div className="flex flex-wrap gap-3">
                {socialConnections.map((conn) => (
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
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
};

export default ProfileOverview;
