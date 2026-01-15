import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import ClientHeader from "@/components/ClientHeader";
import { Building2, Users, Lightbulb, Pencil } from "lucide-react";
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

const ClientProfile = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        navigate("/client/auth");
      } else {
        setUser(user);
      }
    });
  }, [navigate]);

  return (
    <div className="min-h-screen bg-background">
      <ClientHeader user={user} />
      
      <main className="max-w-5xl mx-auto px-6 py-12">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Your Business Profile</h1>
          <p className="text-muted-foreground">Complete your profile so your marketing team can create personalized content</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <ProfileCard
            icon={<Building2 className="w-6 h-6 text-primary" />}
            iconBg="bg-primary/10"
            title="Company Information"
            description="Business details & industry"
            status="not_filled"
            onClick={() => navigate("/client/profile/company")}
            buttonColor="text-primary"
          />
          <ProfileCard
            icon={<Users className="w-6 h-6 text-emerald-500" />}
            iconBg="bg-emerald-500/10"
            title="Target Audience"
            description="Who you want to reach"
            status="not_filled"
            onClick={() => navigate("/client/profile/audience")}
            buttonColor="text-emerald-500"
          />
          <ProfileCard
            icon={<Lightbulb className="w-6 h-6 text-orange-500" />}
            iconBg="bg-orange-500/10"
            title="Value Proposition"
            description="What makes you unique"
            status="not_filled"
            onClick={() => navigate("/client/profile/value")}
            buttonColor="text-orange-500"
          />
        </div>

        <div className="mt-12 p-6 bg-purple-50 dark:bg-purple-900/20 rounded-xl border border-purple-200 dark:border-purple-800/50">
          <h3 className="font-semibold text-foreground mb-2">Why complete your profile?</h3>
          <p className="text-muted-foreground text-sm">
            Your profile information helps your marketing team create campaigns that truly represent your brand. 
            The more detailed your profile, the better the content will match your vision.
          </p>
        </div>
      </main>
    </div>
  );
};

export default ClientProfile;
