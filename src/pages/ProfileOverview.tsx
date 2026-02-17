import { useEffect, useState, type ReactNode } from "react";
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
import GoogleDriveIcon from "@/components/icons/GoogleDriveIcon";
import NotionIcon from "@/components/icons/NotionIcon";
import AdobeCreativeCloudIcon from "@/components/icons/AdobeCreativeCloudIcon";
import SlackIcon from "@/components/icons/SlackIcon";
import FigmaIcon from "@/components/icons/FigmaIcon";
import DiscordIcon from "@/components/icons/DiscordIcon";
import MondayIcon from "@/components/icons/MondayIcon";
import BoxIcon from "@/components/icons/BoxIcon";
import DropboxIcon from "@/components/icons/DropboxIcon";
import PatreonIcon from "@/components/icons/PatreonIcon";
import TwitchIcon from "@/components/icons/TwitchIcon";
import TumblrIcon from "@/components/icons/TumblrIcon";
import RedditIcon from "@/components/icons/RedditIcon";
import SnapchatIcon from "@/components/icons/SnapchatIcon";
import TelegramIcon from "@/components/icons/TelegramIcon";
import ThreadsIcon from "@/components/icons/ThreadsIcon";
import WhatsAppIcon from "@/components/icons/WhatsAppIcon";
import AirtableIcon from "@/components/icons/AirtableIcon";
import ClickUpIcon from "@/components/icons/ClickUpIcon";
import LoomIcon from "@/components/icons/LoomIcon";
import TrelloIcon from "@/components/icons/TrelloIcon";
import MediumIcon from "@/components/icons/MediumIcon";
import SubstackIcon from "@/components/icons/SubstackIcon";
import BeRealIcon from "@/components/icons/BeRealIcon";

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
  const [hasGoogleDrive, setHasGoogleDrive] = useState(false);
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

      // Check for Google Drive connection
      const { data: driveConn } = await supabase
        .from("google_drive_connections")
        .select("id, connection_status")
        .eq("user_id", effectiveUserId)
        .eq("connection_status", "connected")
        .maybeSingle();
      
      setHasGoogleDrive(!!driveConn);

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
    google_drive: "Google Drive",
  };

  const platformIcons: Record<string, ReactNode> = {
    tiktok: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1v-3.5a6.37 6.37 0 0 0-.79-.05A6.34 6.34 0 0 0 3.15 15a6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.34-6.34V8.75a8.18 8.18 0 0 0 4.76 1.52V6.84a4.84 4.84 0 0 1-1-.15Z"/></svg>,
    instagram: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C16.67.014 16.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z"/></svg>,
    youtube: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="#FF0000"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>,
    facebook: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="#1877F2"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>,
    twitter: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>,
    linkedin: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="#0A66C2"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>,
    google_analytics: <svg className="w-4 h-4" viewBox="0 0 24 24"><path d="M22.84 2.9982V20.9982C22.8435 22.1009 21.9462 22.9982 20.8435 22.9982H20.84C19.7353 22.9982 18.8379 22.1009 18.84 20.9982L18.84 2.9982C18.8365 1.89551 19.734 0.998206 20.8367 0.998207L20.84 0.998207C21.9427 0.998208 22.84 1.89552 22.84 2.9982Z" fill="#F9AB00"/><path d="M13.84 13.0018V21.0018C13.8435 22.1045 12.9462 23.0018 11.8435 23.0018H11.84C10.7353 23.0018 9.83791 22.1045 9.84001 21.0018V13.0018C9.83655 11.8991 10.734 11.0018 11.8367 11.0018L11.84 11.0018C12.9427 11.0018 13.84 11.8991 13.84 13.0018Z" fill="#E37400"/><circle cx="2.84" cy="21.0018" r="2" fill="#E37400"/></svg>,
    google_drive: <GoogleDriveIcon className="w-4 h-4" />,
    notion: <NotionIcon className="w-4 h-4" />,
    adobe_cc: <AdobeCreativeCloudIcon className="w-4 h-4" />,
    slack: <SlackIcon className="w-4 h-4" />,
    figma: <FigmaIcon className="w-4 h-4" />,
    discord: <DiscordIcon className="w-4 h-4" />,
    monday: <MondayIcon className="w-4 h-4" />,
    box: <BoxIcon className="w-4 h-4" />,
    dropbox: <DropboxIcon className="w-4 h-4" />,
    patreon: <PatreonIcon className="w-4 h-4" />,
    twitch: <TwitchIcon className="w-4 h-4" />,
    tumblr: <TumblrIcon className="w-4 h-4" />,
    reddit: <RedditIcon className="w-4 h-4" />,
    snapchat: <SnapchatIcon className="w-4 h-4" />,
    telegram: <TelegramIcon className="w-4 h-4" />,
    threads: <ThreadsIcon className="w-4 h-4" />,
    whatsapp: <WhatsAppIcon className="w-4 h-4" />,
    airtable: <AirtableIcon className="w-4 h-4" />,
    clickup: <ClickUpIcon className="w-4 h-4" />,
    loom: <LoomIcon className="w-4 h-4" />,
    trello: <TrelloIcon className="w-4 h-4" />,
    medium: <MediumIcon className="w-4 h-4" />,
    substack: <SubstackIcon className="w-4 h-4" />,
    bereal: <BeRealIcon className="w-4 h-4" />,
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

        {/* Connected Platforms - Always visible */}
        <Card className="bg-card border-border mb-8">
          <CardContent className="p-6">
            <h2 className="text-lg font-semibold text-foreground mb-4">Platforms Connected</h2>
            {allConnections.length > 0 ? (
              <div className="flex flex-wrap gap-3">
                {allConnections.map((conn) => {
                  const key = conn.platform.toLowerCase();
                  const icon = platformIcons[key];
                  return (
                    <div 
                      key={conn.platform}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg bg-purple-500/10 border border-purple-500/30"
                    >
                      {icon || <CheckCircle2 className="w-4 h-4 text-purple-500" />}
                      <span className="text-sm font-medium text-foreground">
                        {platformLabels[key] || conn.platform}
                      </span>
                      {conn.platform_username && (
                        <span className="text-xs text-muted-foreground">
                          @{conn.platform_username}
                        </span>
                      )}
                    </div>
                  );
                })}
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
      </main>
    </div>
  );
};

export default ProfileOverview;
