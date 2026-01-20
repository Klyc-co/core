import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import AppHeader from "@/components/AppHeader";
import { ArrowLeft, Globe, Music, Facebook, Instagram, Linkedin, Twitter, Youtube, Shield, Check, Loader2, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import type { User } from "@supabase/supabase-js";

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
}

const socialPlatforms: SocialPlatform[] = [
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
];

const ImportBrandSources = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [user, setUser] = useState<User | null>(null);
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [isScanning, setIsScanning] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<Record<string, ConnectionStatus>>({});

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
        // Check for connected identities
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
    
    // Check for custom OAuth connections in social_connections table
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
    
    setConnectionStatus(newStatus);
  };

  const handleScanWebsite = async () => {
    if (!websiteUrl) return;
    setIsScanning(true);
    // TODO: Implement website scraping with Firecrawl
    setTimeout(() => setIsScanning(false), 2000);
  };

  const handleConnectPlatform = async (platform: SocialPlatform) => {
    if (platform.comingSoon) {
      toast.info(`${platform.name} integration coming soon!`);
      return;
    }

    // Handle custom OAuth (TikTok, Instagram, YouTube)
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
      const { data, error } = await supabase.auth.signInWithOAuth({
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
      
      <main className="max-w-5xl mx-auto px-6 py-12">
        <Button
          variant="ghost"
          onClick={() => navigate("/profile")}
          className="mb-6 text-primary hover:text-primary/80 -ml-2"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Import Brand Sources</h1>
          <p className="text-muted-foreground">
            Connect your website and social media accounts to automatically extract and organize your brand assets
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
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
                />
              </div>

              <Button 
                onClick={handleScanWebsite}
                disabled={!websiteUrl || isScanning}
                className="w-full bg-gradient-to-r from-orange-400 to-orange-500 hover:from-orange-500 hover:to-orange-600 text-white"
              >
                {isScanning ? "Scanning..." : "⚡ Scan Website (1-5 min)"}
              </Button>

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

        {/* Security Note */}
        <Card className="p-4 bg-muted/50 border-muted">
          <div className="flex items-start gap-3">
            <Shield className="w-5 h-5 text-amber-500 mt-0.5" />
            <div>
              <h3 className="font-medium text-foreground mb-1">Security & Privacy:</h3>
              <p className="text-sm text-muted-foreground">
                We securely store your credentials and never share them with third parties. You can disconnect any account at any time. All imported assets are stored locally and can be managed from your library.
              </p>
            </div>
          </div>
        </Card>
      </main>
    </div>
  );
};

export default ImportBrandSources;
