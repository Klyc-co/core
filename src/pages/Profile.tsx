import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import AppHeader from "@/components/AppHeader";
import ClientSwitcher from "@/components/ClientSwitcher";
import AddClientDialog from "@/components/AddClientDialog";
import { Building2, Pencil, Globe, FolderOpen, Share2, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { User } from "@supabase/supabase-js";

interface ProfileCardProps {
  icon: React.ReactNode;
  iconBg: string;
  title: string;
  description: string;
  status: "filled" | "not_filled";
  onClick: () => void;
  buttonColor: string;
}

const ProfileCard = ({ icon, iconBg, title, description, status, onClick, buttonColor }: ProfileCardProps) => (
  <div 
    className="bg-card border border-border rounded-xl p-4 sm:p-6 flex flex-col gap-3 sm:gap-4 hover:shadow-lg hover:border-primary/30 transition-all duration-300 cursor-pointer group"
    onClick={onClick}
  >
    <div className="flex items-start gap-3 sm:gap-4">
      <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-lg ${iconBg} flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform`}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="font-semibold text-foreground text-base sm:text-lg truncate">{title}</h3>
        <p className="text-muted-foreground text-xs sm:text-sm truncate">{description}</p>
      </div>
    </div>
    <div className="flex items-center justify-between">
      <p className="text-muted-foreground text-xs sm:text-sm">
        {status === "filled" ? "✓ Completed" : "Not filled yet"}
      </p>
      <Button 
        variant="outline" 
        size="sm" 
        className={`gap-1.5 ${buttonColor} border-current hover:bg-current/10 text-xs sm:text-sm`}
        onClick={(e) => {
          e.stopPropagation();
          onClick();
        }}
      >
        <Pencil className="w-3 h-3" />
        <span className="hidden sm:inline">Fill</span>
      </Button>
    </div>
  </div>
);

const Profile = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [currentClientId, setCurrentClientId] = useState<string | null>(null);
  const [currentClientName, setCurrentClientName] = useState<string | null>(null);
  const [addClientOpen, setAddClientOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        navigate("/auth");
      } else {
        setUser(user);
        // Load saved client from localStorage
        const savedClientId = localStorage.getItem("currentClientId");
        const savedClientName = localStorage.getItem("currentClientName");
        if (savedClientId) {
          setCurrentClientId(savedClientId);
          setCurrentClientName(savedClientName);
        }
      }
    });
  }, [navigate]);

  const handleClientChange = (clientId: string | null, clientName: string | null) => {
    setCurrentClientId(clientId);
    setCurrentClientName(clientName);
    if (clientId) {
      localStorage.setItem("currentClientId", clientId);
      localStorage.setItem("currentClientName", clientName || "");
    } else {
      localStorage.removeItem("currentClientId");
      localStorage.removeItem("currentClientName");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <AppHeader user={user} businessName={currentClientName || undefined} />
      
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-12">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 sm:gap-0 mb-6 sm:mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-1 sm:mb-2">Profile</h1>
            <p className="text-sm sm:text-base text-muted-foreground">Build your company profile to personalize your content generation</p>
          </div>
          
          <div className="flex flex-col sm:items-end gap-1 sm:gap-2">
            <span className="text-xs sm:text-sm text-muted-foreground">Working on:</span>
            <ClientSwitcher
              key={refreshKey}
              currentClientId={currentClientId}
              onClientChange={handleClientChange}
              onAddClient={() => setAddClientOpen(true)}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-4 sm:mb-6">
          <ProfileCard
            icon={<Building2 className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />}
            iconBg="bg-primary/10"
            title="Business Profile"
            description="Company, audience & value proposition"
            status="not_filled"
            onClick={() => navigate("/profile/company")}
            buttonColor="text-primary"
          />
          <ProfileCard
            icon={<Globe className="w-5 h-5 sm:w-6 sm:h-6 text-blue-500" />}
            iconBg="bg-blue-500/10"
            title="Import Brand Sources"
            description="Website & social media assets"
            status="not_filled"
            onClick={() => navigate("/profile/import")}
            buttonColor="text-blue-500"
          />
          <ProfileCard
            icon={<FolderOpen className="w-5 h-5 sm:w-6 sm:h-6 text-purple-500" />}
            iconBg="bg-purple-500/10"
            title="Brand Library"
            description="All your imported assets"
            status="not_filled"
            onClick={() => navigate("/profile/library")}
            buttonColor="text-purple-500"
          />
          <ProfileCard
            icon={<Share2 className="w-5 h-5 sm:w-6 sm:h-6 text-pink-500" />}
            iconBg="bg-pink-500/10"
            title="Social Media Assets"
            description="Posts, images & analytics"
            status="not_filled"
            onClick={() => navigate("/profile/social")}
            buttonColor="text-pink-500"
          />
          <ProfileCard
            icon={<Package className="w-5 h-5 sm:w-6 sm:h-6 text-teal-500" />}
            iconBg="bg-teal-500/10"
            title="Products"
            description="Your products & product lines"
            status="not_filled"
            onClick={() => navigate("/profile/products")}
            buttonColor="text-teal-500"
          />
        </div>
      </main>

      <AddClientDialog
        open={addClientOpen}
        onOpenChange={setAddClientOpen}
        onClientAdded={() => setRefreshKey(prev => prev + 1)}
      />
    </div>
  );
};

export default Profile;
