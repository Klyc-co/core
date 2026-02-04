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
  Users, 
  Target,
  CheckCircle2,
  Circle
} from "lucide-react";
import type { User } from "@supabase/supabase-js";
import { useClientContext } from "@/contexts/ClientContext";

interface SocialConnection {
  platform: string;
  platform_username: string | null;
}

const ProfileOverview = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [socialConnections, setSocialConnections] = useState<SocialConnection[]>([]);
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
      setLoading(false);
    };

    fetchData();
  }, [navigate, isDefaultClient, selectedClientId]);

  const displayName = isDefaultClient ? "My Business" : selectedClientName;
  const businessName = profile?.business_name || displayName || "Your Business";
  const website = profile?.website || "Not set";
  const industry = profile?.industry || "Not specified";
  const targetAudience = profile?.target_audience || "Not defined";

  const platforms = [
    { name: "TikTok", key: "tiktok" },
    { name: "Instagram", key: "instagram" },
    { name: "YouTube", key: "youtube" },
    { name: "Facebook", key: "facebook" },
    { name: "Twitter/X", key: "twitter" },
    { name: "LinkedIn", key: "linkedin" },
  ];

  const getConnectionStatus = (platformKey: string) => {
    return socialConnections.some(
      conn => conn.platform.toLowerCase() === platformKey.toLowerCase()
    );
  };

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
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-8">
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
            className="gap-2"
          >
            <Pencil className="w-4 h-4" />
            Edit Profile
          </Button>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <Card className="bg-card border-border">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Building2 className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Industry</p>
                <p className="font-medium text-foreground text-sm">{industry}</p>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-card border-border">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <Users className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Target Audience</p>
                <p className="font-medium text-foreground text-sm truncate max-w-[150px]">
                  {targetAudience}
                </p>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-card border-border">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                <Target className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Platforms Connected</p>
                <p className="font-medium text-foreground text-sm">
                  {socialConnections.length} of {platforms.length}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Connected Platforms */}
        <Card className="bg-card border-border mb-8">
          <CardContent className="p-6">
            <h2 className="text-lg font-semibold text-foreground mb-4">Connected Platforms</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {platforms.map((platform) => {
                const isConnected = getConnectionStatus(platform.key);
                return (
                  <div 
                    key={platform.key}
                    className={`flex items-center gap-2 p-3 rounded-lg border ${
                      isConnected 
                        ? "bg-green-500/5 border-green-500/20" 
                        : "bg-muted/30 border-border"
                    }`}
                  >
                    {isConnected ? (
                      <CheckCircle2 className="w-4 h-4 text-green-500" />
                    ) : (
                      <Circle className="w-4 h-4 text-muted-foreground" />
                    )}
                    <span className={`text-sm ${isConnected ? "text-foreground" : "text-muted-foreground"}`}>
                      {platform.name}
                    </span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4">
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
      </main>
    </div>
  );
};

export default ProfileOverview;
