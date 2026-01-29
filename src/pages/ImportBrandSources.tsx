import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import AppHeader from "@/components/AppHeader";
import { ArrowLeft, Globe, Music, Facebook, Instagram, Linkedin, Twitter, Youtube, Shield, Check, Loader2, BarChart3, CheckCircle2, FolderOpen, ExternalLink, CircleDot, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import type { User } from "@supabase/supabase-js";
import GoogleDriveIcon from "@/components/icons/GoogleDriveIcon";
import CanvaIcon from "@/components/icons/CanvaIcon";
import ElevenLabsIcon from "@/components/icons/ElevenLabsIcon";
import SlackIcon from "@/components/icons/SlackIcon";
import DiscordIcon from "@/components/icons/DiscordIcon";
import CapCutIcon from "@/components/icons/CapCutIcon";
import RiversideIcon from "@/components/icons/RiversideIcon";

type ConnectionStatus = 'disconnected' | 'connecting' | 'connected';

interface SocialPlatform {
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  textColor: string;
  provider?: 'google' | 'facebook' | 'twitter' | 'linkedin_oidc';
  scopes?: string[];
  comingSoon?: boolean;
  customOAuth?: boolean;
  isGoogleDrive?: boolean;
}

interface ScanResult {
  colors: number;
  fonts: number;
  images: number;
  copy: number;
}

const socialPlatforms: SocialPlatform[] = [
  { 
    name: "Google Drive", 
    icon: GoogleDriveIcon, 
    color: "bg-white dark:bg-gray-800", 
    textColor: "text-green-600",
    isGoogleDrive: true,
  },
  { 
    name: "YouTube", 
    icon: Youtube, 
    color: "bg-red-600", 
    textColor: "text-red-600",
    customOAuth: true,
  },
  { 
    name: "Facebook", 
    icon: Facebook, 
    color: "bg-blue-600", 
    textColor: "text-blue-600",
    customOAuth: true,
  },
  { 
    name: "Instagram", 
    icon: Instagram, 
    color: "bg-gradient-to-br from-purple-600 via-pink-500 to-orange-400", 
    textColor: "text-pink-500",
    customOAuth: true,
  },
  { 
    name: "LinkedIn", 
    icon: Linkedin, 
    color: "bg-blue-700", 
    textColor: "text-blue-700",
    customOAuth: true
  },
  { 
    name: "Twitter/X", 
    icon: Twitter, 
    color: "bg-gray-800", 
    textColor: "text-gray-800 dark:text-gray-200",
    customOAuth: true,
  },
  { 
    name: "TikTok", 
    icon: Music, 
    color: "bg-black", 
    textColor: "text-black dark:text-white",
    customOAuth: true,
  },
  { 
    name: "Pinterest", 
    icon: CircleDot, 
    color: "bg-red-600", 
    textColor: "text-red-600",
    comingSoon: true,
  },
];

const ImportBrandSources = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [user, setUser] = useState<User | null>(null);
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<Record<string, ConnectionStatus>>({});
  const [showDriveDialog, setShowDriveDialog] = useState(false);
  const [driveSetupInfo, setDriveSetupInfo] = useState<{
    user_id: string;
    callback_url: string;
    folder_url?: string;
  } | null>(null);
  const [driveConnection, setDriveConnection] = useState<{
    folder_url?: string;
    assets_sheet_url?: string;
    last_sync_at?: string;
  } | null>(null);

  useEffect(() => {
    // Handle OAuth callback messages
    const success = searchParams.get("success");
    const youtubeSuccess = searchParams.get("youtube_success");
    const youtubeError = searchParams.get("youtube_error");
    const error = searchParams.get("error");
    
    if (success === "tiktok") {
      toast.success("TikTok connected successfully!");
      setConnectionStatus(prev => ({ ...prev, TikTok: 'connected' }));
      window.history.replaceState({}, document.title, window.location.pathname);
    }
    
    if (success === "instagram") {
      toast.success("Instagram connected successfully!");
      setConnectionStatus(prev => ({ ...prev, Instagram: 'connected' }));
      window.history.replaceState({}, document.title, window.location.pathname);
    }
    
    if (success === "facebook") {
      toast.success("Facebook connected successfully!");
      setConnectionStatus(prev => ({ ...prev, Facebook: 'connected' }));
      window.history.replaceState({}, document.title, window.location.pathname);
    }
    
    if (success === "twitter") {
      toast.success("Twitter/X connected successfully!");
      setConnectionStatus(prev => ({ ...prev, "Twitter/X": 'connected' }));
      window.history.replaceState({}, document.title, window.location.pathname);
    }
    
    if (success === "linkedin") {
      toast.success("LinkedIn connected successfully!");
      setConnectionStatus(prev => ({ ...prev, LinkedIn: 'connected' }));
      window.history.replaceState({}, document.title, window.location.pathname);
    }
    
    if (youtubeSuccess === "true") {
      toast.success("YouTube connected successfully!");
      setConnectionStatus(prev => ({ ...prev, YouTube: 'connected' }));
      window.history.replaceState({}, document.title, window.location.pathname);
    }
    
    if (youtubeError) {
      toast.error(`YouTube connection failed: ${youtubeError}`);
      window.history.replaceState({}, document.title, window.location.pathname);
    }
    
    if (error) {
      toast.error(`Connection failed: ${error}`);
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [searchParams]);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        navigate("/auth");
      } else {
        setUser(user);
        checkConnectedAccounts(user);
      }
    });
  }, [navigate]);

  const checkConnectedAccounts = async (user: User) => {
    const identities = user.identities || [];
    const newStatus: Record<string, ConnectionStatus> = {};
    
    identities.forEach(identity => {
      if (identity.provider === 'facebook') {
        newStatus['Facebook'] = 'connected';
      }
      if (identity.provider === 'twitter') {
        newStatus['Twitter/X'] = 'connected';
      }
      if (identity.provider === 'linkedin_oidc') {
        newStatus['LinkedIn'] = 'connected';
      }
    });
    
    const { data: socialConnections } = await supabase
      .from("social_connections")
      .select("platform")
      .eq("user_id", user.id);
    
    if (socialConnections) {
      socialConnections.forEach((conn) => {
        if (conn.platform === "tiktok") {
          newStatus['TikTok'] = 'connected';
        }
        if (conn.platform === "instagram") {
          newStatus['Instagram'] = 'connected';
        }
        if (conn.platform === "youtube") {
          newStatus['YouTube'] = 'connected';
        }
        if (conn.platform === "facebook") {
          newStatus['Facebook'] = 'connected';
        }
        if (conn.platform === "twitter") {
          newStatus['Twitter/X'] = 'connected';
        }
        if (conn.platform === "linkedin") {
          newStatus['LinkedIn'] = 'connected';
        }
      });
    }

    // Check Google Drive connection
    const { data: driveConn } = await supabase
      .from("google_drive_connections")
      .select("id, folder_url, assets_sheet_url, last_sync_at, connection_status")
      .eq("user_id", user.id)
      .maybeSingle();
    
    if (driveConn && driveConn.connection_status === 'connected') {
      newStatus['Google Drive'] = 'connected';
      setDriveConnection({
        folder_url: driveConn.folder_url,
        assets_sheet_url: driveConn.assets_sheet_url,
        last_sync_at: driveConn.last_sync_at,
      });
    }
    
    setConnectionStatus(newStatus);
  };

  const handleConnectGoogleDrive = async () => {
    if (!user) {
      toast.error("Please log in first");
      return;
    }

    setConnectionStatus(prev => ({ ...prev, "Google Drive": 'connecting' }));

    try {
      const { data, error } = await supabase.functions.invoke("google-drive-init");
      
      if (error) {
        throw new Error(error.message);
      }

      if (data.already_connected) {
        toast.success("Google Drive already connected!");
        setConnectionStatus(prev => ({ ...prev, "Google Drive": 'connected' }));
        setDriveConnection({ folder_url: data.folder_url });
        return;
      }

      setDriveSetupInfo({
        user_id: data.user_id,
        callback_url: data.callback_url,
      });
      setShowDriveDialog(true);
      setConnectionStatus(prev => ({ ...prev, "Google Drive": 'disconnected' }));
    } catch (err) {
      console.error("Google Drive init error:", err);
      toast.error("Failed to initialize Google Drive connection");
      setConnectionStatus(prev => ({ ...prev, "Google Drive": 'disconnected' }));
    }
  };

  const handleScanWebsite = async () => {
    if (!websiteUrl) return;
    
    setIsScanning(true);
    setScanResult(null);
    
    try {
      const { data, error } = await supabase.functions.invoke("scan-website", {
        body: { url: websiteUrl }
      });
      
      if (error) {
        throw new Error(error.message);
      }
      
      if (!data.success) {
        throw new Error(data.error || "Failed to scan website");
      }
      
      setScanResult(data.summary);
      toast.success(`Website scanned! Found ${data.assetsCount} brand assets.`);
    } catch (err: unknown) {
      console.error("Failed to scan website:", err);
      const message = err instanceof Error ? err.message : "Unknown error";
      toast.error(message);
    } finally {
      setIsScanning(false);
    }
  };

  const handleConnectPlatform = async (platform: SocialPlatform) => {
    if (platform.comingSoon) {
      toast.info(`${platform.name} integration coming soon!`);
      return;
    }

    // Handle Google Drive separately
    if (platform.isGoogleDrive) {
      await handleConnectGoogleDrive();
      return;
    }

    if (platform.customOAuth) {
      if (!user) {
        toast.error("Please log in first");
        return;
      }

      setConnectionStatus(prev => ({ ...prev, [platform.name]: 'connecting' }));

      try {
        let functionName: string;
        if (platform.name === "TikTok") {
          functionName = "tiktok-auth-url";
        } else if (platform.name === "YouTube") {
          functionName = "youtube-auth-url";
        } else if (platform.name === "Facebook") {
          functionName = "facebook-auth-url";
        } else if (platform.name === "Twitter/X") {
          functionName = "twitter-auth-url";
        } else if (platform.name === "LinkedIn") {
          functionName = "linkedin-auth-url";
        } else {
          functionName = "instagram-auth-url";
        }
        
        const { data, error } = await supabase.functions.invoke(functionName);
        
        if (error) {
          throw new Error(error.message);
        }

        const authUrl = data?.authUrl || data?.url;
        if (authUrl) {
          window.location.href = authUrl;
        } else {
          throw new Error("No auth URL returned");
        }
        return;
      } catch (err) {
        console.error(`${platform.name} OAuth error:`, err);
        toast.error(`Failed to connect ${platform.name}`);
        setConnectionStatus(prev => ({ ...prev, [platform.name]: 'disconnected' }));
        return;
      }
    }

    if (!platform.provider) {
      toast.error(`${platform.name} connection not configured`);
      return;
    }

    setConnectionStatus(prev => ({ ...prev, [platform.name]: 'connecting' }));

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: platform.provider,
        options: {
          redirectTo: `${window.location.origin}/import-brand-sources`,
          scopes: platform.scopes?.join(' '),
          queryParams: platform.provider === 'google' ? {
            access_type: 'offline',
            prompt: 'consent',
          } : undefined,
        },
      });

      if (error) {
        console.error('OAuth error:', error);
        toast.error(`Failed to connect ${platform.name}: ${error.message}`);
        setConnectionStatus(prev => ({ ...prev, [platform.name]: 'disconnected' }));
      }
    } catch (err) {
      console.error('Connection error:', err);
      toast.error(`Failed to connect ${platform.name}`);
      setConnectionStatus(prev => ({ ...prev, [platform.name]: 'disconnected' }));
    }
  };

  const getButtonContent = (platform: SocialPlatform) => {
    const status = connectionStatus[platform.name] || 'disconnected';
    
    if (platform.comingSoon) {
      return 'Coming Soon';
    }
    
    switch (status) {
      case 'connecting':
        return (
          <>
            <Loader2 className="w-3 h-3 animate-spin" />
            Connecting...
          </>
        );
      case 'connected':
        return (
          <>
            <Check className="w-3 h-3" />
            Connected
          </>
        );
      default:
        return 'Connect Account';
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <AppHeader user={user} />
      
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-12">
        <Button
          variant="ghost"
          onClick={() => navigate("/profile")}
          className="mb-4 sm:mb-6 text-primary hover:text-primary/80 -ml-2"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>

        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-1 sm:mb-2">Import Brand Sources</h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Connect your website and social media accounts to automatically extract and organize your brand assets
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-6 sm:mb-8">
          {/* Website Import Card */}
          <Card className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <Globe className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-foreground">Website Import</h2>
                <p className="text-sm text-muted-foreground">Scan your website for brand assets</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">
                  Enter your website URL
                </label>
                <Input
                  type="url"
                  placeholder="https://example.com"
                  value={websiteUrl}
                  onChange={(e) => setWebsiteUrl(e.target.value)}
                  disabled={isScanning}
                />
              </div>

              <Button 
                onClick={handleScanWebsite}
                disabled={!websiteUrl || isScanning}
                className="w-full bg-gradient-to-r from-orange-400 to-orange-500 hover:from-orange-500 hover:to-orange-600 text-white"
              >
                {isScanning ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Scanning Website...
                  </>
                ) : (
                  "⚡ Scan Website"
                )}
              </Button>

              {scanResult && (
                <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20">
                  <div className="flex items-center gap-2 text-green-600 dark:text-green-400 mb-3">
                    <CheckCircle2 className="w-5 h-5" />
                    <span className="font-medium">Scan Complete!</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Colors:</span>
                      <span className="font-medium text-foreground">{scanResult.colors}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Fonts:</span>
                      <span className="font-medium text-foreground">{scanResult.fonts}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Images:</span>
                      <span className="font-medium text-foreground">{scanResult.images}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Copy:</span>
                      <span className="font-medium text-foreground">{scanResult.copy}</span>
                    </div>
                  </div>
                  <Button 
                    variant="link" 
                    className="mt-3 p-0 h-auto text-primary"
                    onClick={() => navigate("/profile/library")}
                  >
                    View in Brand Library →
                  </Button>
                </div>
              )}

              <p className="text-xs text-muted-foreground">
                We will crawl your public pages and extract colors, fonts, copy blocks, images, and brand structure.
              </p>
            </div>
          </Card>

          {/* Social Media Import Card */}
          <Card className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-lg bg-pink-500/10 flex items-center justify-center">
                <Music className="w-6 h-6 text-pink-500" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-foreground">Social Media Import</h2>
                <p className="text-sm text-muted-foreground">Connect your social platforms</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {socialPlatforms.map((platform) => {
                const status = connectionStatus[platform.name] || 'disconnected';
                const isConnected = status === 'connected';
                const isConnecting = status === 'connecting';
                
                return (
                  <div key={platform.name} className="space-y-2">
                    <div className="flex items-center gap-2">
                      <div className={`w-8 h-8 rounded-lg ${platform.color} flex items-center justify-center`}>
                        <platform.icon className="w-4 h-4 text-white" />
                      </div>
                      <span className="text-sm font-medium text-foreground">{platform.name}</span>
                      {isConnected && (
                        <Check className="w-4 h-4 text-green-500" />
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        variant={isConnected ? "outline" : "secondary"} 
                        size="sm" 
                        className={`flex-1 ${isConnected ? 'border-green-500/50 text-green-600 dark:text-green-400' : ''} ${platform.comingSoon ? 'opacity-50' : ''}`}
                        onClick={() => handleConnectPlatform(platform)}
                        disabled={isConnecting || platform.comingSoon}
                      >
                        {getButtonContent(platform)}
                      </Button>
                      {isConnected && platform.name === "TikTok" && (
                        <Button 
                          variant="secondary" 
                          size="sm"
                          onClick={() => navigate("/profile/tiktok-analytics")}
                          className="gap-1"
                        >
                          <BarChart3 className="w-3 h-3" />
                          Analytics
                        </Button>
                      )}
                      {isConnected && platform.name === "Instagram" && (
                        <Button 
                          variant="secondary" 
                          size="sm"
                          onClick={() => navigate("/profile/instagram-analytics")}
                          className="gap-1"
                        >
                          <BarChart3 className="w-3 h-3" />
                          Analytics
                        </Button>
                      )}
                      {isConnected && platform.name === "YouTube" && (
                        <Button 
                          variant="secondary" 
                          size="sm"
                          onClick={() => navigate("/profile/youtube-analytics")}
                          className="gap-1"
                        >
                          <BarChart3 className="w-3 h-3" />
                          Analytics
                        </Button>
                      )}
                      {isConnected && platform.name === "Facebook" && (
                        <Button 
                          variant="secondary" 
                          size="sm"
                          onClick={() => navigate("/profile/facebook-analytics")}
                          className="gap-1"
                        >
                          <BarChart3 className="w-3 h-3" />
                          Analytics
                        </Button>
                      )}
                      {isConnected && platform.name === "Twitter/X" && (
                        <Button 
                          variant="secondary" 
                          size="sm"
                          onClick={() => navigate("/profile/twitter-analytics")}
                          className="gap-1"
                        >
                          <BarChart3 className="w-3 h-3" />
                          Analytics
                        </Button>
                      )}
                      {isConnected && platform.name === "LinkedIn" && (
                        <Button 
                          variant="secondary" 
                          size="sm"
                          onClick={() => navigate("/profile/linkedin-analytics")}
                          className="gap-1"
                        >
                          <BarChart3 className="w-3 h-3" />
                          Analytics
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>

        {/* Social Tools Section */}
        <Card className="p-6 mt-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-lg bg-purple-500/10 flex items-center justify-center">
              <Wand2 className="w-6 h-6 text-purple-500" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-foreground">Social Tools</h2>
              <p className="text-sm text-muted-foreground">Creative and AI-powered tools</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Canva */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-[#00C4CC] flex items-center justify-center">
                  <CanvaIcon className="w-5 h-5" />
                </div>
                <span className="text-sm font-medium text-foreground">Canva</span>
              </div>
              <Button 
                variant="secondary" 
                size="sm" 
                className="w-full opacity-50"
                disabled
              >
                Coming Soon
              </Button>
            </div>

            {/* ElevenLabs */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-black dark:bg-white flex items-center justify-center">
                  <ElevenLabsIcon className="w-4 h-4 text-white dark:text-black" />
                </div>
                <span className="text-sm font-medium text-foreground">ElevenLabs</span>
              </div>
              <Button 
                variant="secondary" 
                size="sm" 
                className="w-full opacity-50"
                disabled
              >
                Coming Soon
              </Button>
            </div>

            {/* Slack */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-white dark:bg-[#4A154B] flex items-center justify-center border border-border">
                  <SlackIcon className="w-5 h-5" />
                </div>
                <span className="text-sm font-medium text-foreground">Slack</span>
              </div>
              <Button 
                variant="secondary" 
                size="sm" 
                className="w-full opacity-50"
                disabled
              >
                Coming Soon
              </Button>
            </div>

            {/* Discord */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-[#5865F2] flex items-center justify-center">
                  <DiscordIcon className="w-5 h-5 text-white" />
                </div>
                <span className="text-sm font-medium text-foreground">Discord</span>
              </div>
              <Button 
                variant="secondary" 
                size="sm" 
                className="w-full opacity-50"
                disabled
              >
                Coming Soon
              </Button>
            </div>

            {/* CapCut */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-black flex items-center justify-center">
                  <CapCutIcon className="w-5 h-5" />
                </div>
                <span className="text-sm font-medium text-foreground">CapCut</span>
              </div>
              <Button 
                variant="secondary" 
                size="sm" 
                className="w-full opacity-50"
                disabled
              >
                Coming Soon
              </Button>
            </div>

            {/* Riverside */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-[#6366F1] flex items-center justify-center">
                  <RiversideIcon className="w-5 h-5" />
                </div>
                <span className="text-sm font-medium text-foreground">Riverside</span>
              </div>
              <Button 
                variant="secondary" 
                size="sm" 
                className="w-full opacity-50"
                disabled
              >
                Coming Soon
              </Button>
            </div>
          </div>
        </Card>

        {/* Security Note */}
        <Card className="p-4 mt-6 bg-muted/50 border-muted">
          <div className="flex items-start gap-3">
            <Shield className="w-5 h-5 text-amber-500 mt-0.5" />
            <div>
              <h3 className="font-medium text-foreground mb-1">Secure Connection</h3>
              <p className="text-sm text-muted-foreground">
                Your brand assets and social media connections are stored securely. We only access public information and the permissions you explicitly grant.
              </p>
            </div>
          </div>
        </Card>

        {/* Google Drive Connected Info */}
        {driveConnection && connectionStatus['Google Drive'] === 'connected' && (
          <Card className="p-4 mt-4 bg-green-500/10 border-green-500/30">
            <div className="flex items-start gap-3">
              <FolderOpen className="w-5 h-5 text-green-500 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-medium text-foreground mb-1">Google Drive Connected</h3>
                <p className="text-sm text-muted-foreground mb-2">
                  Your marketing assets folder is connected. Assets will sync automatically.
                </p>
                <div className="flex flex-wrap gap-2">
                  {driveConnection.folder_url && (
                    <Button variant="outline" size="sm" asChild>
                      <a href={driveConnection.folder_url} target="_blank" rel="noopener noreferrer">
                        <FolderOpen className="w-3 h-3 mr-1" />
                        Open Folder
                        <ExternalLink className="w-3 h-3 ml-1" />
                      </a>
                    </Button>
                  )}
                  {driveConnection.assets_sheet_url && (
                    <Button variant="outline" size="sm" asChild>
                      <a href={driveConnection.assets_sheet_url} target="_blank" rel="noopener noreferrer">
                        Asset Index
                        <ExternalLink className="w-3 h-3 ml-1" />
                      </a>
                    </Button>
                  )}
                </div>
                {driveConnection.last_sync_at && (
                  <p className="text-xs text-muted-foreground mt-2">
                    Last synced: {new Date(driveConnection.last_sync_at).toLocaleString()}
                  </p>
                )}
              </div>
            </div>
          </Card>
        )}
      </main>

      {/* Google Drive Setup Dialog */}
      <Dialog open={showDriveDialog} onOpenChange={setShowDriveDialog}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <GoogleDriveIcon className="w-5 h-5" />
              Connect Google Drive via Zapier
            </DialogTitle>
            <DialogDescription>
              Set up a Zapier automation to connect your Google Drive for marketing asset storage.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 pt-4">
            <div className="bg-muted rounded-lg p-4 space-y-3">
              <h4 className="font-medium text-sm">Your Zapier Setup Details:</h4>
              
              <div className="space-y-2 text-sm">
                <div>
                  <span className="text-muted-foreground">User ID:</span>
                  <code className="ml-2 bg-background px-2 py-0.5 rounded text-xs">{driveSetupInfo?.user_id}</code>
                </div>
                <div>
                  <span className="text-muted-foreground">Callback URL:</span>
                  <div className="mt-1">
                    <code className="bg-background px-2 py-1 rounded text-xs block break-all">{driveSetupInfo?.callback_url}</code>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="font-medium text-sm">Steps to complete:</h4>
              <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
                <li>Create a Zap with a "Webhooks by Zapier" trigger (Catch Hook)</li>
                <li>Add Google Drive actions to create your asset folder structure</li>
                <li>Add Google Sheets actions to create an asset tracking spreadsheet</li>
                <li>Add a final "POST" action to send the folder/sheet IDs to the callback URL above</li>
                <li>Trigger the Zap to complete the connection</li>
              </ol>
            </div>

            <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3">
              <p className="text-sm text-amber-600 dark:text-amber-400">
                <strong>Tip:</strong> Include <code className="text-xs">action: "setup_complete"</code> and your <code className="text-xs">user_id</code> in the POST body, along with <code className="text-xs">folder_id</code>, <code className="text-xs">folder_url</code>, and sheet details.
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => setShowDriveDialog(false)}>
              Close
            </Button>
            <Button onClick={() => {
              navigator.clipboard.writeText(driveSetupInfo?.callback_url || '');
              toast.success("Callback URL copied to clipboard!");
            }}>
              Copy Callback URL
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ImportBrandSources;