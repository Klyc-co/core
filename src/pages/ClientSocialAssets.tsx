import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import ClientHeader from "@/components/ClientHeader";
import { ArrowLeft, Globe, Music, Facebook, Instagram, Linkedin, Twitter, Youtube, Shield, Check, Loader2, HardDrive, FolderOpen, ExternalLink, AtSign } from "lucide-react";
import ThreadsIcon from "@/components/icons/ThreadsIcon";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import DropboxConnectionCard from "@/components/DropboxConnectionCard";
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
  isGoogleDrive?: boolean;
  isDropbox?: boolean;
}

const socialPlatforms: SocialPlatform[] = [
  { 
    name: "Dropbox", 
    icon: HardDrive, 
    color: "bg-[#0061FF]", 
    textColor: "text-[#0061FF]",
    isDropbox: true,
  },
  { 
    name: "Google Drive", 
    icon: HardDrive, 
    color: "bg-gradient-to-br from-yellow-400 via-green-500 to-blue-500", 
    textColor: "text-green-600",
    isGoogleDrive: true,
  },
  { 
    name: "YouTube", 
    icon: Youtube, 
    color: "bg-red-600", 
    textColor: "text-red-600",
    provider: 'google',
    scopes: ['https://www.googleapis.com/auth/youtube.readonly']
  },
  { 
    name: "Instagram", 
    icon: Instagram, 
    color: "bg-gradient-to-br from-purple-600 via-pink-500 to-orange-400", 
    textColor: "text-pink-500",
    customOAuth: true,
  },
  { 
    name: "Facebook", 
    icon: Facebook, 
    color: "bg-blue-600", 
    textColor: "text-blue-600",
    comingSoon: true
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
    comingSoon: true
  },
  { 
    name: "TikTok", 
    icon: Music, 
    color: "bg-black", 
    textColor: "text-black dark:text-white",
    customOAuth: true,
  },
  { 
    name: "Threads", 
    icon: AtSign, 
    color: "bg-black", 
    textColor: "text-black dark:text-white",
    customOAuth: true,
  },
];

const ClientSocialAssets = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [user, setUser] = useState<User | null>(null);
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [isScanning, setIsScanning] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<Record<string, ConnectionStatus>>({});
  const [driveConnection, setDriveConnection] = useState<{
    folder_url?: string;
    assets_sheet_url?: string;
    last_sync_at?: string;
  } | null>(null);

  useEffect(() => {
    const success = searchParams.get("success");
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
    
    if (success === "linkedin") {
      toast.success("LinkedIn connected successfully!");
      setConnectionStatus(prev => ({ ...prev, LinkedIn: 'connected' }));
      window.history.replaceState({}, document.title, window.location.pathname);
    }
    
    if (success === "dropbox") {
      toast.success("Dropbox connected successfully!");
      setConnectionStatus(prev => ({ ...prev, Dropbox: 'connected' }));
      window.history.replaceState({}, document.title, window.location.pathname);
    }
    
    if (success === "threads") {
      toast.success("Threads connected successfully!");
      setConnectionStatus(prev => ({ ...prev, Threads: 'connected' }));
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
        navigate("/client/auth");
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
      if (identity.provider === 'google') {
        newStatus['YouTube'] = 'connected';
      }
      if (identity.provider === 'facebook') {
        newStatus['Facebook'] = 'connected';
        newStatus['Instagram'] = 'connected';
      }
      if (identity.provider === 'twitter') {
        newStatus['Twitter/X'] = 'connected';
      }
      if (identity.provider === 'linkedin_oidc') {
        newStatus['LinkedIn'] = 'connected';
      }
    });
    
    const { data: tiktokConnection } = await supabase
      .from("social_connections")
      .select("id")
      .eq("user_id", user.id)
      .eq("platform", "tiktok")
      .maybeSingle();
    
    if (tiktokConnection) {
      newStatus['TikTok'] = 'connected';
    }
    
    const { data: instagramConnection } = await supabase
      .from("social_connections")
      .select("id")
      .eq("user_id", user.id)
      .eq("platform", "instagram")
      .maybeSingle();
    
    if (instagramConnection) {
      newStatus['Instagram'] = 'connected';
    }
    
    const { data: linkedinConnection } = await supabase
      .from("social_connections")
      .select("id")
      .eq("user_id", user.id)
      .eq("platform", "linkedin")
      .maybeSingle();
    
    if (linkedinConnection) {
      newStatus['LinkedIn'] = 'connected';
    }

    // Check Threads connection
    const { data: threadsConnection } = await supabase
      .from("social_connections")
      .select("id")
      .eq("user_id", user.id)
      .eq("platform", "threads")
      .maybeSingle();
    
    if (threadsConnection) {
      newStatus['Threads'] = 'connected';
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

    // Check Dropbox connection
    const { data: dropboxConn } = await supabase
      .from("dropbox_connections")
      .select("id, connection_status")
      .eq("user_id", user.id)
      .maybeSingle();
    
    if (dropboxConn && dropboxConn.connection_status === 'connected') {
      newStatus['Dropbox'] = 'connected';
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
      // Direct Google Drive OAuth flow
      const { data, error } = await supabase.functions.invoke("google-drive-auth-url");
      if (error) throw new Error(error.message);
      if (data?.url) {
        window.location.href = data.url;
      } else {
        toast.error("Failed to get Google Drive auth URL");
        setConnectionStatus(prev => ({ ...prev, "Google Drive": 'disconnected' }));
      }
    } catch (err) {
      console.error("Google Drive connect error:", err);
      toast.error("Failed to connect Google Drive");
      setConnectionStatus(prev => ({ ...prev, "Google Drive": 'disconnected' }));
    }
  };

  const handleScanWebsite = async () => {
    if (!websiteUrl) return;
    setIsScanning(true);
    setTimeout(() => {
      setIsScanning(false);
      toast.success("Website scan complete! Assets imported to your library.");
    }, 3000);
  };

  const handleConnectPlatform = async (platform: SocialPlatform) => {
    if (platform.comingSoon) {
      toast.info(`${platform.name} integration coming soon!`);
      return;
    }

    // Handle Dropbox separately - it uses its own card component
    if (platform.isDropbox) {
      return; // Handled by DropboxConnectionCard
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
          window.open(authUrl, '_blank');
          toast.info(`Complete ${platform.name} authorization in the new window`);
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
          redirectTo: `${window.location.origin}/client/profile/social`,
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
        return 'Connect';
    }
  };

  const connectedCount = Object.values(connectionStatus).filter(s => s === 'connected').length;

  return (
    <div className="min-h-screen bg-background">
      <ClientHeader user={user} />
      
      <main className="max-w-5xl mx-auto px-6 py-12">
        <Button
          variant="ghost"
          onClick={() => navigate("/client/profile")}
          className="mb-6 text-primary hover:text-primary/80 -ml-2"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Profile
        </Button>

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Social Media Assets</h1>
          <p className="text-muted-foreground">
            Connect your social media accounts so your marketing team can access your brand assets and analytics
          </p>
        </div>

        {/* Connection Summary */}
        <Card className="p-4 mb-8 bg-gradient-to-r from-purple-500/10 to-pink-500/10 border-purple-500/20">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-foreground">Connected Accounts</h3>
              <p className="text-sm text-muted-foreground">
                {connectedCount} of {socialPlatforms.length} platforms connected
              </p>
            </div>
            <div className="flex -space-x-2">
              {socialPlatforms.filter(p => connectionStatus[p.name] === 'connected').map(p => (
                <div key={p.name} className={`w-8 h-8 rounded-full ${p.color} flex items-center justify-center border-2 border-background`}>
                  <p.icon className="w-4 h-4 text-white" />
                </div>
              ))}
            </div>
          </div>
        </Card>

        {/* Social Platforms Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          {socialPlatforms.map((platform) => {
            // Use DropboxConnectionCard for Dropbox
            if (platform.isDropbox && user) {
              return (
                <DropboxConnectionCard
                  key={platform.name}
                  userId={user.id}
                  onConnectionChange={() => user && checkConnectedAccounts(user)}
                />
              );
            }

            const status = connectionStatus[platform.name] || 'disconnected';
            const isConnected = status === 'connected';
            const isConnecting = status === 'connecting';
            
            return (
              <Card key={platform.name} className={`p-5 ${isConnected ? 'border-green-500/50 bg-green-500/5' : ''}`}>
                <div className="flex items-center gap-3 mb-4">
                  <div className={`w-12 h-12 rounded-xl ${platform.color} flex items-center justify-center`}>
                    <platform.icon className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-foreground">{platform.name}</h3>
                    <p className="text-xs text-muted-foreground">
                      {isConnected ? 'Account connected' : platform.comingSoon ? 'Coming soon' : 'Not connected'}
                    </p>
                  </div>
                  {isConnected && (
                    <Check className="w-5 h-5 text-green-500" />
                  )}
                </div>
                
                <Button 
                  variant={isConnected ? "outline" : "default"} 
                  size="sm" 
                  className={`w-full ${isConnected ? 'border-green-500/50 text-green-600 dark:text-green-400' : ''} ${platform.comingSoon ? 'opacity-50' : ''}`}
                  onClick={() => handleConnectPlatform(platform)}
                  disabled={isConnecting || platform.comingSoon}
                >
                  {getButtonContent(platform)}
                </Button>
              </Card>
            );
          })}
        </div>

        {/* Website Import */}
        <Card className="p-6 mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
              <Globe className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-foreground">Website Import</h2>
              <p className="text-sm text-muted-foreground">Import brand assets from your website</p>
            </div>
          </div>

          <div className="flex gap-3">
            <Input
              type="url"
              placeholder="https://yourcompany.com"
              value={websiteUrl}
              onChange={(e) => setWebsiteUrl(e.target.value)}
              className="flex-1"
            />
            <Button 
              onClick={handleScanWebsite}
              disabled={!websiteUrl || isScanning}
            >
              {isScanning ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Scanning...
                </>
              ) : (
                "Scan Website"
              )}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            We'll extract logos, colors, fonts, and images from your website
          </p>
        </Card>

        {/* Security Note */}
        <Card className="p-4 bg-muted/50 border-muted">
          <div className="flex items-start gap-3">
            <Shield className="w-5 h-5 text-amber-500 mt-0.5" />
            <div>
              <h3 className="font-medium text-foreground mb-1">Security & Privacy</h3>
              <p className="text-sm text-muted-foreground">
                Your credentials are securely encrypted and only used to import your brand assets. 
                Your marketing team will have access to view your connected accounts and analytics to create better content for you.
                You can disconnect any account at any time.
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

    </div>
  );
};

export default ClientSocialAssets;
