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
  CheckCircle2
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
  const logoUrl = profile?.logo_url;

  const platformLabels: Record<string, string> = {
    tiktok: "TikTok",
    instagram: "Instagram",
    youtube: "YouTube",
    facebook: "Facebook",
    twitter: "Twitter/X",
    linkedin: "LinkedIn",
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

          {/* Business Info & Stats */}
          <div className="flex-1 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-1">
                {businessName}
              </h1>
              <div className="flex items-center gap-2 text-muted-foreground mb-4">
                <Globe className="w-4 h-4" />
                <span className="text-sm">{website}</span>
              </div>
              
              {/* Quick Stats inline */}
              <div className="flex flex-wrap gap-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Building2 className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Industry</p>
                    <p className="font-medium text-foreground text-sm">{industry}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                    <Users className="w-4 h-4 text-blue-500" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Audience</p>
                    <p className="font-medium text-foreground text-sm max-w-[150px] truncate">
                      {targetAudience}
                    </p>
                  </div>
                </div>
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

        {/* Connected Platforms - Only show if there are connections */}
        {socialConnections.length > 0 && (
          <Card className="bg-card border-border mb-8">
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
