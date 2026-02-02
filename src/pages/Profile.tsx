import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import AppHeader from "@/components/AppHeader";
import ClientSwitcher from "@/components/ClientSwitcher";
import AddClientDialog from "@/components/AddClientDialog";
import { Building2, Pencil, FolderOpen, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { User } from "@supabase/supabase-js";
import { useClientContext } from "@/contexts/ClientContext";

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
        <span className="hidden sm:inline">Open</span>
      </Button>
    </div>
  </div>
);

const Profile = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [addClientOpen, setAddClientOpen] = useState(false);
  const { selectedClientName, isDefaultClient } = useClientContext();

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        navigate("/auth");
      } else {
        setUser(user);
      }
    });
  }, [navigate]);

  const displayName = isDefaultClient ? "My Business" : selectedClientName;

  return (
    <div className="min-h-screen bg-background">
      <AppHeader user={user} businessName={displayName || undefined} />
      
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-12">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 sm:gap-0 mb-6 sm:mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-1 sm:mb-2">Profile</h1>
            <p className="text-sm sm:text-base text-muted-foreground">Build your company profile to personalize your content generation</p>
          </div>
          
          <div className="flex flex-col sm:items-end gap-1 sm:gap-2">
            <span className="text-xs sm:text-sm text-muted-foreground">Working on:</span>
            <ClientSwitcher
              onAddClient={() => setAddClientOpen(true)}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          <ProfileCard
            icon={<Building2 className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />}
            iconBg="bg-primary/10"
            title="Business Profile"
            description="Company info, audience & brand sources"
            status="not_filled"
            onClick={() => navigate("/profile/company")}
            buttonColor="text-primary"
          />
          <ProfileCard
            icon={<FolderOpen className="w-5 h-5 sm:w-6 sm:h-6 text-purple-500" />}
            iconBg="bg-purple-500/10"
            title="Brand Library"
            description="Assets & social media content"
            status="not_filled"
            onClick={() => navigate("/profile/library")}
            buttonColor="text-purple-500"
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
        onClientAdded={() => {}}
      />
    </div>
  );
};

export default Profile;
