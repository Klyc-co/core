import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import AppHeader from "@/components/AppHeader";
import { ArrowLeft, Check, FolderOpen, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import type { User } from "@supabase/supabase-js";
import DropboxFilePicker from "@/components/DropboxFilePicker";
import GoogleDriveFilePicker from "@/components/GoogleDriveFilePicker";
import AdobeFilePicker from "@/components/AdobeFilePicker";
import CanvaFilePicker from "@/components/CanvaFilePicker";

// Storage & Tool Icons
import GoogleDriveIcon from "@/components/icons/GoogleDriveIcon";
import AdobeCreativeCloudIcon from "@/components/icons/AdobeCreativeCloudIcon";
import DropboxIcon from "@/components/icons/DropboxIcon";
import NotionIcon from "@/components/icons/NotionIcon";
import OneDriveIcon from "@/components/icons/OneDriveIcon";
import BoxIcon from "@/components/icons/BoxIcon";
import CanvaIcon from "@/components/icons/CanvaIcon";
import FigmaIcon from "@/components/icons/FigmaIcon";
import AirtableIcon from "@/components/icons/AirtableIcon";
import TrelloIcon from "@/components/icons/TrelloIcon";

import MiroIcon from "@/components/icons/MiroIcon";
import FrameioIcon from "@/components/icons/FrameioIcon";
import LoomIcon from "@/components/icons/LoomIcon";
import WeTransferIcon from "@/components/icons/WeTransferIcon";

interface StoragePlatform {
  id: string;
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  bgColor: string;
  description: string;
  connectionTable?: string;
  hasFilePicker?: boolean;
  comingSoon?: boolean;
}

const storagePlatforms: StoragePlatform[] = [
  {
    id: "dropbox",
    name: "Dropbox",
    icon: DropboxIcon,
    bgColor: "bg-[#0061FF]",
    description: "Import files from your Dropbox folders",
    connectionTable: "dropbox_connections",
    hasFilePicker: true,
  },
  {
    id: "google-drive",
    name: "Google Drive",
    icon: GoogleDriveIcon,
    bgColor: "bg-white border border-gray-200",
    description: "Import files from Google Drive",
    connectionTable: "google_drive_connections",
    hasFilePicker: true,
  },
  {
    id: "adobe-cc",
    name: "Adobe Creative Cloud",
    icon: AdobeCreativeCloudIcon,
    bgColor: "bg-[#FF0000]",
    description: "Import assets from Adobe Creative Cloud",
    connectionTable: "social_connections",
    hasFilePicker: true,
  },
  {
    id: "notion",
    name: "Notion",
    icon: NotionIcon,
    bgColor: "bg-black",
    description: "Import pages and databases from Notion",
    comingSoon: true,
  },
  {
    id: "onedrive",
    name: "OneDrive",
    icon: OneDriveIcon,
    bgColor: "bg-[#0078D4]",
    description: "Import files from Microsoft OneDrive",
    connectionTable: "social_connections",
    hasFilePicker: false,
  },
  {
    id: "box",
    name: "Box",
    icon: BoxIcon,
    bgColor: "bg-[#0061D5]",
    description: "Import files from Box",
    connectionTable: "social_connections",
    hasFilePicker: false,
  },
  {
    id: "canva",
    name: "Canva",
    icon: CanvaIcon,
    bgColor: "bg-[#00C4CC]",
    description: "Import designs from Canva",
    connectionTable: "social_connections",
    hasFilePicker: true,
  },
  {
    id: "figma",
    name: "Figma",
    icon: FigmaIcon,
    bgColor: "bg-black",
    description: "Import designs from Figma",
    comingSoon: true,
  },
  {
    id: "adobe-cc",
    name: "Adobe Creative Cloud",
    icon: AdobeCreativeCloudIcon,
    bgColor: "bg-[#FF0000]",
    description: "Import assets from Adobe CC",
    comingSoon: true,
  },
  {
    id: "airtable",
    name: "Airtable",
    icon: AirtableIcon,
    bgColor: "bg-[#FFBF00]",
    description: "Import from Airtable bases",
    connectionTable: "airtable_connections",
  },
  {
    id: "trello",
    name: "Trello",
    icon: TrelloIcon,
    bgColor: "bg-[#0079BF]",
    description: "Import from Trello boards",
    comingSoon: true,
  },
  {
    id: "miro",
    name: "Miro",
    icon: MiroIcon,
    bgColor: "bg-[#FFD02F]",
    description: "Import from Miro boards",
    comingSoon: true,
  },
  {
    id: "frameio",
    name: "Frame.io",
    icon: FrameioIcon,
    bgColor: "bg-[#6C47FF]",
    description: "Import videos from Frame.io",
    comingSoon: true,
  },
  {
    id: "loom",
    name: "Loom",
    icon: LoomIcon,
    bgColor: "bg-[#625DF5]",
    description: "Import recordings from Loom",
    comingSoon: true,
  },
  {
    id: "wetransfer",
    name: "WeTransfer",
    icon: WeTransferIcon,
    bgColor: "bg-[#409FFF]",
    description: "Import from WeTransfer",
    comingSoon: true,
  },
];

interface ConnectionStatus {
  [key: string]: boolean;
}

const ImportAssetSources = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>({});
  const [selectedPlatform, setSelectedPlatform] = useState<StoragePlatform | null>(null);
  const [showDropboxPicker, setShowDropboxPicker] = useState(false);
  const [showGoogleDrivePicker, setShowGoogleDrivePicker] = useState(false);
  const [showAdobePicker, setShowAdobePicker] = useState(false);
  const [showCanvaPicker, setShowCanvaPicker] = useState(false);

  useEffect(() => {
    const canvaStatus = searchParams.get("canva");
    const error = searchParams.get("error");
    if (canvaStatus === "connected") {
      toast.success("Canva connected successfully!");
    } else if (error) {
      toast.error("Failed to connect. Please try again.");
    }
  }, [searchParams]);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        navigate("/auth");
      } else {
        setUser(user);
        checkConnections(user.id);
      }
    });
  }, [navigate]);

  const checkConnections = async (userId: string) => {
    setLoading(true);
    try {
      const connections: ConnectionStatus = {};

      const [dropboxRes, gdriveRes, adobeRes, boxRes, airtableRes, canvaRes, onedriveRes] = await Promise.all([
        supabase.from("dropbox_connections").select("id, connection_status").eq("user_id", userId).maybeSingle(),
        supabase.from("social_connections").select("id").eq("user_id", userId).eq("platform", "google_drive").maybeSingle(),
        supabase.from("social_connections").select("id").eq("user_id", userId).eq("platform", "adobe_cc").maybeSingle(),
        supabase.from("social_connections").select("id").eq("user_id", userId).eq("platform", "box").maybeSingle(),
        supabase.from("airtable_connections").select("id").eq("user_id", userId).maybeSingle(),
        supabase.from("social_connections").select("id").eq("user_id", userId).eq("platform", "canva").maybeSingle(),
        supabase.from("social_connections").select("id").eq("user_id", userId).eq("platform", "onedrive").maybeSingle(),
      ]);

      connections["dropbox"] = dropboxRes.data?.connection_status === "connected";
      connections["google-drive"] = !!gdriveRes.data;
      connections["adobe-cc"] = !!adobeRes.data;
      connections["box"] = !!boxRes.data;
      connections["airtable"] = !!airtableRes.data;
      connections["canva"] = !!canvaRes.data;
      connections["onedrive"] = !!onedriveRes.data;

      setConnectionStatus(connections);
    } catch (error) {
      console.error("Failed to check connections:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleConnectCanva = async () => {
    try {
      const { data, error } = await supabase.functions.invoke("canva-auth-url");
      if (error) throw error;
      if (data?.authUrl) {
        window.location.href = data.authUrl;
      } else {
        toast.error("Failed to get Canva authorization URL");
      }
    } catch (err) {
      console.error("Canva connect error:", err);
      toast.error("Failed to connect Canva. Please try again.");
    }
  };

  const handlePlatformClick = (platform: StoragePlatform) => {
    if (platform.comingSoon) {
      toast.info(`${platform.name} integration coming soon!`);
      return;
    }

    const isConnected = connectionStatus[platform.id];

    if (!isConnected) {
      if (platform.id === "canva") {
        handleConnectCanva();
        return;
      }
      navigate("/profile/import");
      toast.info(`Please connect ${platform.name} first`);
      return;
    }

    if (platform.id === "dropbox") {
      setShowDropboxPicker(true);
    } else if (platform.id === "google-drive") {
      setShowGoogleDrivePicker(true);
    } else if (platform.id === "adobe-cc") {
      setShowAdobePicker(true);
    } else if (platform.id === "canva") {
      setShowCanvaPicker(true);
    }
  };

  const handleImportComplete = () => {
    setShowDropboxPicker(false);
    setShowGoogleDrivePicker(false);
    toast.success("Assets imported successfully!");
  };

  return (
    <div className="min-h-screen bg-background">
      <AppHeader user={user} />
      
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-12">
        <Button 
          variant="ghost" 
          onClick={() => navigate("/profile/library")} 
          className="mb-4 sm:mb-6 text-primary hover:text-primary/80 -ml-2"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Library
        </Button>

        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">
            Import Assets
          </h1>
          <p className="text-muted-foreground">
            Choose a platform to import files from. Connected platforms will let you browse and select files.
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {storagePlatforms.map((platform) => {
              const isConnected = connectionStatus[platform.id];
              const Icon = platform.icon;
              
              return (
                <Card
                  key={platform.id}
                  className={`p-4 cursor-pointer transition-all hover:shadow-md hover:border-primary/50 ${
                    platform.comingSoon ? "opacity-60" : ""
                  } ${isConnected ? "border-green-500/50 bg-green-500/5" : ""}`}
                  onClick={() => handlePlatformClick(platform)}
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-12 h-12 rounded-xl ${platform.bgColor} flex items-center justify-center flex-shrink-0`}>
                      <Icon className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-foreground truncate">
                          {platform.name}
                        </h3>
                        {isConnected && (
                          <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                        )}
                        {platform.comingSoon && (
                          <span className="text-xs bg-muted px-2 py-0.5 rounded-full text-muted-foreground flex-shrink-0">
                            Soon
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                        {isConnected 
                          ? "Click to browse files" 
                          : platform.comingSoon 
                            ? platform.description 
                            : "Click to connect"
                        }
                      </p>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}

        {/* Info card */}
        <Card className="mt-8 p-4 bg-muted/30 border-dashed">
          <div className="flex gap-3">
            <FolderOpen className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-medium text-foreground mb-1">
                Need to connect a new platform?
              </h4>
              <p className="text-sm text-muted-foreground">
                Visit the{" "}
                <button 
                  onClick={() => navigate("/profile/import")}
                  className="text-primary hover:underline"
                >
                  Import Brand Sources
                </button>
                {" "}page to connect new accounts.
              </p>
            </div>
          </div>
        </Card>
      </main>

      {/* Dropbox File Picker */}
      <DropboxFilePicker
        open={showDropboxPicker}
        onOpenChange={setShowDropboxPicker}
        onImportComplete={handleImportComplete}
      />

      {/* Google Drive File Picker */}
      <GoogleDriveFilePicker
        open={showGoogleDrivePicker}
        onOpenChange={setShowGoogleDrivePicker}
        onImportComplete={handleImportComplete}
      />

      {/* Adobe CC File Picker */}
      <AdobeFilePicker
        open={showAdobePicker}
        onOpenChange={setShowAdobePicker}
        onImportComplete={handleImportComplete}
      />

      {/* Canva File Picker */}
      <CanvaFilePicker
        open={showCanvaPicker}
        onOpenChange={setShowCanvaPicker}
        onImportComplete={handleImportComplete}
      />
    </div>
  );
};

export default ImportAssetSources;
