import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import AppHeader from "@/components/AppHeader";
import ClientSwitcher from "@/components/ClientSwitcher";
import AddClientDialog from "@/components/AddClientDialog";
import { Building2, Users, Lightbulb, Pencil, Globe, FolderOpen, Share2, Package } from "lucide-react";
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
  <div className="bg-card border border-border rounded-xl p-6 flex flex-col gap-4 hover:shadow-lg transition-shadow">
    <div className="flex items-start justify-between">
      <div className="flex items-center gap-4">
        <div className={`w-12 h-12 rounded-lg ${iconBg} flex items-center justify-center`}>
          {icon}
        </div>
        <div>
          <h3 className="font-semibold text-foreground text-lg">{title}</h3>
          <p className="text-muted-foreground text-sm">{description}</p>
        </div>
      </div>
      <Button 
        variant="outline" 
        size="sm" 
        onClick={onClick}
        className={`gap-2 ${buttonColor} border-current hover:bg-current/10`}
      >
        <Pencil className="w-3 h-3" />
        Fill
      </Button>
    </div>
    <p className="text-muted-foreground text-sm">
      {status === "filled" ? "Completed" : "Not filled yet. Click Fill to get started."}
    </p>
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
      
      <main className="max-w-5xl mx-auto px-6 py-12">
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">Profile</h1>
            <p className="text-muted-foreground">Build your company profile to personalize your content generation</p>
          </div>
          
          <div className="flex flex-col items-end gap-2">
            <span className="text-sm text-muted-foreground">Working on:</span>
            <ClientSwitcher
              key={refreshKey}
              currentClientId={currentClientId}
              onClientChange={handleClientChange}
              onAddClient={() => setAddClientOpen(true)}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <ProfileCard
            icon={<Building2 className="w-6 h-6 text-primary" />}
            iconBg="bg-primary/10"
            title="Company Information"
            description="Business info & market analysis"
            status="not_filled"
            onClick={() => navigate("/profile/company")}
            buttonColor="text-primary"
          />
          <ProfileCard
            icon={<Users className="w-6 h-6 text-emerald-500" />}
            iconBg="bg-emerald-500/10"
            title="Target Audience"
            description="Who you want to reach"
            status="not_filled"
            onClick={() => navigate("/profile/audience")}
            buttonColor="text-emerald-500"
          />
          <ProfileCard
            icon={<Lightbulb className="w-6 h-6 text-orange-500" />}
            iconBg="bg-orange-500/10"
            title="Value Proposition"
            description="What makes you unique"
            status="not_filled"
            onClick={() => navigate("/profile/value")}
            buttonColor="text-orange-500"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <ProfileCard
            icon={<Globe className="w-6 h-6 text-blue-500" />}
            iconBg="bg-blue-500/10"
            title="Import Brand Sources"
            description="Website & social media assets"
            status="not_filled"
            onClick={() => navigate("/profile/import")}
            buttonColor="text-blue-500"
          />
          <ProfileCard
            icon={<FolderOpen className="w-6 h-6 text-purple-500" />}
            iconBg="bg-purple-500/10"
            title="Brand Library"
            description="All your imported assets"
            status="not_filled"
            onClick={() => navigate("/profile/library")}
            buttonColor="text-purple-500"
          />
          <ProfileCard
            icon={<Share2 className="w-6 h-6 text-pink-500" />}
            iconBg="bg-pink-500/10"
            title="Social Media Assets"
            description="Posts, images & analytics"
            status="not_filled"
            onClick={() => navigate("/profile/social")}
            buttonColor="text-pink-500"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
          <ProfileCard
            icon={<Package className="w-6 h-6 text-teal-500" />}
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
