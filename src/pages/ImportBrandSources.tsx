import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import AppHeader from "@/components/AppHeader";
import { ArrowLeft, Globe, Music, Facebook, Instagram, Linkedin, Twitter, Youtube, Shield, Check, Loader2, BarChart3, CheckCircle2, FolderOpen, ExternalLink, CircleDot, Wand2, Users, ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import type { User } from "@supabase/supabase-js";
// Icon imports
import GoogleDriveIcon from "@/components/icons/GoogleDriveIcon";
import SnapchatIcon from "@/components/icons/SnapchatIcon";
import CanvaIcon from "@/components/icons/CanvaIcon";
import ElevenLabsIcon from "@/components/icons/ElevenLabsIcon";
import SlackIcon from "@/components/icons/SlackIcon";
import DiscordIcon from "@/components/icons/DiscordIcon";
import CapCutIcon from "@/components/icons/CapCutIcon";
import RiversideIcon from "@/components/icons/RiversideIcon";
import DropboxIcon from "@/components/icons/DropboxIcon";
import BazaartIcon from "@/components/icons/BazaartIcon";
import VideoleapIcon from "@/components/icons/VideoleapIcon";
import NotionIcon from "@/components/icons/NotionIcon";
import TrelloIcon from "@/components/icons/TrelloIcon";
import AsanaIcon from "@/components/icons/AsanaIcon";
import AirtableIcon from "@/components/icons/AirtableIcon";
import ClickUpIcon from "@/components/icons/ClickUpIcon";
import FigmaIcon from "@/components/icons/FigmaIcon";
import AdobeCreativeCloudIcon from "@/components/icons/AdobeCreativeCloudIcon";
import DaVinciResolveIcon from "@/components/icons/DaVinciResolveIcon";
import DescriptIcon from "@/components/icons/DescriptIcon";
import VeedIcon from "@/components/icons/VeedIcon";
import LoomIcon from "@/components/icons/LoomIcon";
import FrameioIcon from "@/components/icons/FrameioIcon";
import MiroIcon from "@/components/icons/MiroIcon";
import MilanoteIcon from "@/components/icons/MilanoteIcon";
import ZapierIcon from "@/components/icons/ZapierIcon";
import IFTTTIcon from "@/components/icons/IFTTTIcon";
import HootsuiteIcon from "@/components/icons/HootsuiteIcon";
import BufferIcon from "@/components/icons/BufferIcon";
import SproutSocialIcon from "@/components/icons/SproutSocialIcon";
import MondayIcon from "@/components/icons/MondayIcon";
import OneDriveIcon from "@/components/icons/OneDriveIcon";
import BoxIcon from "@/components/icons/BoxIcon";
import WeTransferIcon from "@/components/icons/WeTransferIcon";
import StreamYardIcon from "@/components/icons/StreamYardIcon";
import RestreamIcon from "@/components/icons/RestreamIcon";
import OBSStudioIcon from "@/components/icons/OBSStudioIcon";
// CRM Icons
import SalesforceIcon from "@/components/icons/SalesforceIcon";
import HubSpotIcon from "@/components/icons/HubSpotIcon";
import ZohoIcon from "@/components/icons/ZohoIcon";
import PipedriveIcon from "@/components/icons/PipedriveIcon";
import KeapIcon from "@/components/icons/KeapIcon";
import ActiveCampaignIcon from "@/components/icons/ActiveCampaignIcon";
import MicrosoftDynamicsIcon from "@/components/icons/MicrosoftDynamicsIcon";
import CopperIcon from "@/components/icons/CopperIcon";
import FreshsalesIcon from "@/components/icons/FreshsalesIcon";
import CloseIcon from "@/components/icons/CloseIcon";
import NutshellIcon from "@/components/icons/NutshellIcon";
import SugarCRMIcon from "@/components/icons/SugarCRMIcon";
import AgileCRMIcon from "@/components/icons/AgileCRMIcon";
// E-commerce Icons
import ShopifyIcon from "@/components/icons/ShopifyIcon";
import WooCommerceIcon from "@/components/icons/WooCommerceIcon";
import BigCommerceIcon from "@/components/icons/BigCommerceIcon";
import MagentoIcon from "@/components/icons/MagentoIcon";
import SamCartIcon from "@/components/icons/SamCartIcon";
import ClickFunnelsIcon from "@/components/icons/ClickFunnelsIcon";
import KajabiIcon from "@/components/icons/KajabiIcon";
import SquarespaceIcon from "@/components/icons/SquarespaceIcon";
import WixIcon from "@/components/icons/WixIcon";
import StripeIcon from "@/components/icons/StripeIcon";
import SquareIcon from "@/components/icons/SquareIcon";
// Additional Social Icons
import TwitchIcon from "@/components/icons/TwitchIcon";
import RedditIcon from "@/components/icons/RedditIcon";
import TumblrIcon from "@/components/icons/TumblrIcon";
import ThreadsIcon from "@/components/icons/ThreadsIcon";
import SubstackIcon from "@/components/icons/SubstackIcon";
import BeRealIcon from "@/components/icons/BeRealIcon";
import WhatsAppIcon from "@/components/icons/WhatsAppIcon";
import TelegramIcon from "@/components/icons/TelegramIcon";
import MediumIcon from "@/components/icons/MediumIcon";
import PatreonIcon from "@/components/icons/PatreonIcon";
import DropboxConnectionCard from "@/components/DropboxConnectionCard";
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
  { 
    name: "Snapchat", 
    icon: SnapchatIcon, 
    color: "bg-[#FFFC00]", 
    textColor: "text-yellow-500",
    comingSoon: true,
  },
  { 
    name: "Twitch", 
    icon: TwitchIcon, 
    color: "bg-[#9146FF]", 
    textColor: "text-[#9146FF]",
    comingSoon: true,
  },
  { 
    name: "Reddit", 
    icon: RedditIcon, 
    color: "bg-[#FF4500]", 
    textColor: "text-[#FF4500]",
    comingSoon: true,
  },
  { 
    name: "Tumblr", 
    icon: TumblrIcon, 
    color: "bg-[#36465D]", 
    textColor: "text-[#36465D]",
    comingSoon: true,
  },
  { 
    name: "Threads", 
    icon: ThreadsIcon, 
    color: "bg-black", 
    textColor: "text-black dark:text-white",
    comingSoon: true,
  },
  { 
    name: "Substack", 
    icon: SubstackIcon, 
    color: "bg-[#FF6719]", 
    textColor: "text-[#FF6719]",
    comingSoon: true,
  },
  { 
    name: "BeReal", 
    icon: BeRealIcon, 
    color: "bg-black", 
    textColor: "text-black dark:text-white",
    comingSoon: true,
  },
  { 
    name: "WhatsApp Business", 
    icon: WhatsAppIcon, 
    color: "bg-[#25D366]", 
    textColor: "text-[#25D366]",
    comingSoon: true,
  },
  { 
    name: "Telegram", 
    icon: TelegramIcon, 
    color: "bg-[#0088CC]", 
    textColor: "text-[#0088CC]",
    comingSoon: true,
  },
  { 
    name: "Medium", 
    icon: MediumIcon, 
    color: "bg-black", 
    textColor: "text-black dark:text-white",
    comingSoon: true,
  },
  { 
    name: "Patreon", 
    icon: PatreonIcon, 
    color: "bg-[#FF424D]", 
    textColor: "text-[#FF424D]",
    comingSoon: true,
  },
];

interface ToolItem {
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  bgColor: string;
  iconColor?: string;
  hasBorder?: boolean;
  isConnectable?: boolean;
}

const socialTools: ToolItem[] = [
  { name: "Dropbox", icon: DropboxIcon, bgColor: "bg-[#0061FF]", iconColor: "text-white", isConnectable: true },
  { name: "Google Drive", icon: GoogleDriveIcon, bgColor: "bg-white dark:bg-gray-800", hasBorder: true, isConnectable: true },
  { name: "Notion", icon: NotionIcon, bgColor: "bg-white dark:bg-gray-800", hasBorder: true },
  { name: "Trello", icon: TrelloIcon, bgColor: "bg-[#0052CC]", iconColor: "text-white" },
  { name: "Asana", icon: AsanaIcon, bgColor: "bg-white dark:bg-gray-800", hasBorder: true },
  { name: "Airtable", icon: AirtableIcon, bgColor: "bg-white dark:bg-gray-800", hasBorder: true },
  { name: "ClickUp", icon: ClickUpIcon, bgColor: "bg-white dark:bg-gray-800", hasBorder: true },
  { name: "Figma", icon: FigmaIcon, bgColor: "bg-white dark:bg-gray-800", hasBorder: true },
  { name: "Adobe Creative Cloud", icon: AdobeCreativeCloudIcon, bgColor: "bg-white dark:bg-gray-800", hasBorder: true },
  { name: "DaVinci Resolve", icon: DaVinciResolveIcon, bgColor: "bg-white dark:bg-gray-800", hasBorder: true },
  { name: "Descript", icon: DescriptIcon, bgColor: "bg-white dark:bg-gray-800", hasBorder: true },
  { name: "VEED.io", icon: VeedIcon, bgColor: "bg-white dark:bg-gray-800", hasBorder: true },
  { name: "Loom", icon: LoomIcon, bgColor: "bg-white dark:bg-gray-800", hasBorder: true },
  { name: "Frame.io", icon: FrameioIcon, bgColor: "bg-white dark:bg-gray-800", hasBorder: true },
  { name: "Miro", icon: MiroIcon, bgColor: "bg-white dark:bg-gray-800", hasBorder: true },
  { name: "Milanote", icon: MilanoteIcon, bgColor: "bg-white dark:bg-gray-800", hasBorder: true },
  { name: "Zapier", icon: ZapierIcon, bgColor: "bg-white dark:bg-gray-800", hasBorder: true },
  { name: "IFTTT", icon: IFTTTIcon, bgColor: "bg-white dark:bg-gray-800", hasBorder: true },
  { name: "Hootsuite", icon: HootsuiteIcon, bgColor: "bg-white dark:bg-gray-800", hasBorder: true },
  { name: "Buffer", icon: BufferIcon, bgColor: "bg-white dark:bg-gray-800", hasBorder: true },
  { name: "Sprout Social", icon: SproutSocialIcon, bgColor: "bg-white dark:bg-gray-800", hasBorder: true },
  { name: "Monday.com", icon: MondayIcon, bgColor: "bg-white dark:bg-gray-800", hasBorder: true },
  { name: "OneDrive", icon: OneDriveIcon, bgColor: "bg-white dark:bg-gray-800", hasBorder: true },
  { name: "Box", icon: BoxIcon, bgColor: "bg-white dark:bg-gray-800", hasBorder: true },
  { name: "WeTransfer", icon: WeTransferIcon, bgColor: "bg-white dark:bg-gray-800", hasBorder: true },
  { name: "StreamYard", icon: StreamYardIcon, bgColor: "bg-white dark:bg-gray-800", hasBorder: true },
  { name: "Restream", icon: RestreamIcon, bgColor: "bg-white dark:bg-gray-800", hasBorder: true },
  { name: "OBS Studio", icon: OBSStudioIcon, bgColor: "bg-white dark:bg-gray-800", hasBorder: true },
  { name: "Canva", icon: CanvaIcon, bgColor: "bg-[#00C4CC]" },
  { name: "ElevenLabs", icon: ElevenLabsIcon, bgColor: "bg-black dark:bg-white", iconColor: "text-white dark:text-black" },
  { name: "Slack", icon: SlackIcon, bgColor: "bg-white dark:bg-[#4A154B]", hasBorder: true },
  { name: "Discord", icon: DiscordIcon, bgColor: "bg-[#5865F2]", iconColor: "text-white" },
  { name: "CapCut", icon: CapCutIcon, bgColor: "bg-black" },
  { name: "Riverside", icon: RiversideIcon, bgColor: "bg-[#6366F1]" },
  { name: "Bazaart", icon: BazaartIcon, bgColor: "bg-transparent" },
  { name: "Videoleap", icon: VideoleapIcon, bgColor: "bg-transparent" },
];

const crmTools: ToolItem[] = [
  { name: "Salesforce", icon: SalesforceIcon, bgColor: "bg-white dark:bg-gray-800", hasBorder: true },
  { name: "HubSpot", icon: HubSpotIcon, bgColor: "bg-white dark:bg-gray-800", hasBorder: true },
  { name: "Zoho CRM", icon: ZohoIcon, bgColor: "bg-white dark:bg-gray-800", hasBorder: true },
  { name: "Pipedrive", icon: PipedriveIcon, bgColor: "bg-white dark:bg-gray-800", hasBorder: true },
  { name: "Keap / Infusionsoft", icon: KeapIcon, bgColor: "bg-white dark:bg-gray-800", hasBorder: true },
  { name: "ActiveCampaign", icon: ActiveCampaignIcon, bgColor: "bg-white dark:bg-gray-800", hasBorder: true },
  { name: "Microsoft Dynamics 365", icon: MicrosoftDynamicsIcon, bgColor: "bg-white dark:bg-gray-800", hasBorder: true },
  { name: "Copper CRM", icon: CopperIcon, bgColor: "bg-white dark:bg-gray-800", hasBorder: true },
  { name: "Freshsales", icon: FreshsalesIcon, bgColor: "bg-white dark:bg-gray-800", hasBorder: true },
  { name: "Close CRM", icon: CloseIcon, bgColor: "bg-white dark:bg-gray-800", hasBorder: true },
  { name: "Monday CRM", icon: MondayIcon, bgColor: "bg-white dark:bg-gray-800", hasBorder: true },
  { name: "Nutshell CRM", icon: NutshellIcon, bgColor: "bg-white dark:bg-gray-800", hasBorder: true },
  { name: "SugarCRM", icon: SugarCRMIcon, bgColor: "bg-white dark:bg-gray-800", hasBorder: true },
  { name: "Agile CRM", icon: AgileCRMIcon, bgColor: "bg-white dark:bg-gray-800", hasBorder: true },
];

const ecommerceTools: ToolItem[] = [
  { name: "Shopify", icon: ShopifyIcon, bgColor: "bg-white dark:bg-gray-800", hasBorder: true },
  { name: "WooCommerce", icon: WooCommerceIcon, bgColor: "bg-white dark:bg-gray-800", hasBorder: true },
  { name: "BigCommerce", icon: BigCommerceIcon, bgColor: "bg-white dark:bg-gray-800", hasBorder: true },
  { name: "Magento", icon: MagentoIcon, bgColor: "bg-white dark:bg-gray-800", hasBorder: true },
  { name: "SamCart", icon: SamCartIcon, bgColor: "bg-white dark:bg-gray-800", hasBorder: true },
  { name: "ClickFunnels", icon: ClickFunnelsIcon, bgColor: "bg-white dark:bg-gray-800", hasBorder: true },
  { name: "Kajabi", icon: KajabiIcon, bgColor: "bg-white dark:bg-gray-800", hasBorder: true },
  { name: "Squarespace Commerce", icon: SquarespaceIcon, bgColor: "bg-white dark:bg-gray-800", hasBorder: true },
  { name: "Wix Stores", icon: WixIcon, bgColor: "bg-white dark:bg-gray-800", hasBorder: true },
  { name: "Stripe CRM", icon: StripeIcon, bgColor: "bg-white dark:bg-gray-800", hasBorder: true },
  { name: "Square CRM", icon: SquareIcon, bgColor: "bg-white dark:bg-gray-800", hasBorder: true },
];

const ImportBrandSources = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [user, setUser] = useState<User | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<Record<string, ConnectionStatus>>({});

  useEffect(() => {
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
    
    if (success === "dropbox") {
      toast.success("Dropbox connected successfully!");
      setConnectionStatus(prev => ({ ...prev, Dropbox: 'connected' }));
      window.history.replaceState({}, document.title, window.location.pathname);
    }
    
    if (success === "google_drive") {
      toast.success("Google Drive connected successfully!");
      setConnectionStatus(prev => ({ ...prev, "Google Drive": 'connected' }));
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
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user);
        checkConnectedAccounts(session.user);
      }
      setIsAuthLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (session?.user) {
          setUser(session.user);
          checkConnectedAccounts(session.user);
        }
        setIsAuthLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

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

    // Check for Google Drive OAuth connection (stored in social_connections)
    const { data: googleDriveConn } = await supabase
      .from("social_connections")
      .select("id")
      .eq("user_id", user.id)
      .eq("platform", "google_drive")
      .maybeSingle();
    
    if (googleDriveConn) {
      newStatus['Google Drive'] = 'connected';
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
      const { data, error } = await supabase.functions.invoke("google-drive-auth-url");
      
      if (error) {
        throw new Error(error.message);
      }

      if (data.authUrl) {
        // Open in new tab to avoid iframe restrictions in preview
        window.open(data.authUrl, '_blank');
      } else {
        throw new Error("No auth URL returned");
      }
    } catch (err) {
      console.error("Google Drive connect error:", err);
      toast.error("Failed to connect to Google Drive");
      setConnectionStatus(prev => ({ ...prev, "Google Drive": 'disconnected' }));
    }
  };

  const handleConnectDropbox = async () => {
    if (!user) {
      toast.error("Please log in first");
      return;
    }

    setConnectionStatus(prev => ({ ...prev, "Dropbox": 'connecting' }));

    try {
      const { data, error } = await supabase.functions.invoke("dropbox-auth-url");
      
      if (error) {
        throw new Error(error.message);
      }

      if (data.authUrl) {
        // Open in new tab to avoid iframe restrictions in preview
        window.open(data.authUrl, '_blank');
      } else {
        throw new Error("No auth URL returned");
      }
    } catch (err) {
      console.error("Dropbox connect error:", err);
      toast.error("Failed to connect to Dropbox");
      setConnectionStatus(prev => ({ ...prev, "Dropbox": 'disconnected' }));
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

  const renderToolGrid = (tools: ToolItem[], showStorageTools = false) => (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
      {showStorageTools && user && (
        <>
          {/* Dropbox */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-[#0061FF] flex items-center justify-center">
                <DropboxIcon className="w-5 h-5 text-white" />
              </div>
              <span className="text-sm font-medium text-foreground">Dropbox</span>
              {connectionStatus['Dropbox'] === 'connected' && (
                <Check className="w-4 h-4 text-purple-500" />
              )}
            </div>
            <Button 
              variant={connectionStatus['Dropbox'] === 'connected' ? "outline" : "secondary"} 
              size="sm" 
              className={`w-full ${connectionStatus['Dropbox'] === 'connected' ? 'border-purple-500/50 text-purple-600 dark:text-purple-400' : ''}`}
              onClick={handleConnectDropbox}
              disabled={connectionStatus['Dropbox'] === 'connecting'}
            >
              {connectionStatus['Dropbox'] === 'connecting' ? (
                <>
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Connecting...
                </>
              ) : connectionStatus['Dropbox'] === 'connected' ? (
                <>
                  <Check className="w-3 h-3" />
                  Connected
                </>
              ) : (
                'Connect'
              )}
            </Button>
          </div>
          {/* Google Drive */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-white dark:bg-gray-800 border border-border flex items-center justify-center">
                <GoogleDriveIcon className="w-5 h-5" />
              </div>
              <span className="text-sm font-medium text-foreground">Google Drive</span>
              {connectionStatus['Google Drive'] === 'connected' && (
                <Check className="w-4 h-4 text-purple-500" />
              )}
            </div>
            <Button 
              variant={connectionStatus['Google Drive'] === 'connected' ? "outline" : "secondary"} 
              size="sm" 
              className={`w-full ${connectionStatus['Google Drive'] === 'connected' ? 'border-purple-500/50 text-purple-600 dark:text-purple-400' : ''}`}
              onClick={handleConnectGoogleDrive}
              disabled={connectionStatus['Google Drive'] === 'connecting'}
            >
              {connectionStatus['Google Drive'] === 'connecting' ? (
                <>
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Connecting...
                </>
              ) : connectionStatus['Google Drive'] === 'connected' ? (
                <>
                  <Check className="w-3 h-3" />
                  Connected
                </>
              ) : (
                'Connect'
              )}
            </Button>
          </div>
        </>
      )}
      {tools.filter(tool => tool.name !== 'Dropbox' && tool.name !== 'Google Drive').map((tool) => (
        <div key={tool.name} className="space-y-2">
          <div className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-lg ${tool.bgColor} ${tool.hasBorder ? 'border border-border' : ''} flex items-center justify-center overflow-hidden`}>
              <tool.icon className={`w-5 h-5 ${tool.iconColor || ''}`} />
            </div>
            <span className="text-sm font-medium text-foreground truncate">{tool.name}</span>
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
      ))}
    </div>
  );

  if (isAuthLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

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

        {/* Website Import Section */}
        <Card className="p-6 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
              <Globe className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-foreground">Website Import</h2>
              <p className="text-sm text-muted-foreground">Scan your website for brand assets</p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-end">
            <div className="flex-1 w-full">
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
              className="w-full sm:w-auto"
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

          {scanResult && (
            <div className="mt-4 p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle2 className="w-5 h-5 text-green-500" />
                <span className="font-medium text-green-600 dark:text-green-400">Scan Complete!</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Colors:</span>
                  <span className="ml-2 font-medium">{scanResult.colors}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Fonts:</span>
                  <span className="ml-2 font-medium">{scanResult.fonts}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Images:</span>
                  <span className="ml-2 font-medium">{scanResult.images}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Copy:</span>
                  <span className="ml-2 font-medium">{scanResult.copy}</span>
                </div>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                className="mt-3"
                onClick={() => navigate("/profile/library")}
              >
                View in Brand Library
              </Button>
            </div>
          )}

          <p className="text-xs text-muted-foreground mt-3">
            We will crawl your public pages and extract colors, fonts, copy blocks, images, and brand structure.
          </p>
        </Card>

        {/* Social Media Import Section */}
        <Card className="p-6 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-lg bg-pink-500/10 flex items-center justify-center">
              <Music className="w-6 h-6 text-pink-500" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-foreground">Social Media Import</h2>
              <p className="text-sm text-muted-foreground">Connect your social platforms</p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
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
                    <span className="text-sm font-medium text-foreground truncate">{platform.name}</span>
                    {isConnected && (
                      <Check className="w-4 h-4 text-purple-500 flex-shrink-0" />
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      variant={isConnected ? "outline" : "secondary"} 
                      size="sm" 
                      className={`flex-1 ${isConnected ? 'border-purple-500/50 text-purple-600 dark:text-purple-400' : ''} ${platform.comingSoon ? 'opacity-50' : ''}`}
                      onClick={() => handleConnectPlatform(platform)}
                      disabled={isConnecting || platform.comingSoon}
                    >
                      {getButtonContent(platform)}
                    </Button>
                  </div>
                  {isConnected && (
                    <Button 
                      variant="secondary" 
                      size="sm"
                      onClick={() => {
                        const routes: Record<string, string> = {
                          'TikTok': '/profile/tiktok-analytics',
                          'Instagram': '/profile/instagram-analytics',
                          'YouTube': '/profile/youtube-analytics',
                          'Facebook': '/profile/facebook-analytics',
                          'Twitter/X': '/profile/twitter-analytics',
                          'LinkedIn': '/profile/linkedin-analytics',
                        };
                        if (routes[platform.name]) navigate(routes[platform.name]);
                      }}
                      className="w-full gap-1"
                    >
                      <BarChart3 className="w-3 h-3" />
                      Analytics
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        </Card>

        {/* Social Tools Section */}
        <Card className="p-6 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-lg bg-purple-500/10 flex items-center justify-center">
              <Wand2 className="w-6 h-6 text-purple-500" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-foreground">Social Tools</h2>
              <p className="text-sm text-muted-foreground">Creative and productivity tools</p>
            </div>
          </div>

          {renderToolGrid(socialTools, true)}
        </Card>

        {/* CRM Tools Section */}
        <Card className="p-6 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-lg bg-blue-500/10 flex items-center justify-center">
              <Users className="w-6 h-6 text-blue-500" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-foreground">CRM Tools</h2>
              <p className="text-sm text-muted-foreground">Customer relationship management platforms</p>
            </div>
          </div>

          {renderToolGrid(crmTools)}

          {/* E-commerce CRM Subsection */}
          <div className="mt-6 pt-6 border-t border-border">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                <ShoppingCart className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-foreground">E-commerce CRM</h3>
                <p className="text-sm text-muted-foreground">E-commerce and checkout platforms</p>
              </div>
            </div>

            {renderToolGrid(ecommerceTools)}
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
      </main>
    </div>
  );
};

export default ImportBrandSources;
