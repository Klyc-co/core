import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import AppHeader from "@/components/AppHeader";
import { ArrowLeft, Linkedin, Users, Mail, Globe, Calendar, Loader2, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import type { User } from "@supabase/supabase-js";

interface LinkedInAnalyticsData {
  profile: {
    id: string;
    name: string;
    firstName: string;
    lastName: string;
    email: string;
    emailVerified: boolean;
    picture: string;
    locale: string;
  };
  connectionInfo: {
    connectedAt: string;
    lastUpdated: string;
    platform_user_id: string;
    platform_username: string;
  };
  note: string;
}

const LinkedInAnalytics = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState<LinkedInAnalyticsData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        navigate("/auth");
      } else {
        setUser(user);
        fetchAnalytics();
      }
    });
  }, [navigate]);

  const fetchAnalytics = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const { data, error } = await supabase.functions.invoke("linkedin-analytics");
      
      if (error) {
        throw new Error(error.message);
      }
      
      if (data.error) {
        throw new Error(data.error);
      }
      
      setAnalytics(data);
    } catch (err: unknown) {
      console.error("Failed to fetch LinkedIn analytics:", err);
      const message = err instanceof Error ? err.message : "Unknown error";
      setError(message);
      toast.error("Failed to load LinkedIn analytics");
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr: string): string => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <div className="flex-1 min-h-screen bg-background">
      <AppHeader user={user} />
      
      <main className="max-w-6xl mx-auto px-6 py-12">
        <Button
          variant="ghost"
          onClick={() => navigate("/profile/import")}
          className="mb-6 text-primary hover:text-primary/80 -ml-2"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Import
        </Button>

        <div className="flex items-center gap-3 mb-8">
          <div className="w-12 h-12 rounded-lg bg-blue-700 flex items-center justify-center">
            <Linkedin className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-foreground">LinkedIn Analytics</h1>
            <p className="text-muted-foreground">View your LinkedIn profile information</p>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <span className="ml-3 text-muted-foreground">Loading analytics...</span>
          </div>
        ) : error ? (
          <Card className="p-8 text-center">
            <p className="text-destructive mb-4">{error}</p>
            <Button onClick={fetchAnalytics}>Retry</Button>
          </Card>
        ) : analytics ? (
          <div className="space-y-6">
            {/* Profile Card */}
            <Card className="p-6">
              <div className="flex items-center gap-4">
                {analytics.profile.picture && (
                  <img 
                    src={analytics.profile.picture} 
                    alt={analytics.profile.name}
                    className="w-20 h-20 rounded-full"
                  />
                )}
                <div>
                  <h2 className="text-2xl font-semibold text-foreground">{analytics.profile.name}</h2>
                  {analytics.profile.email && (
                    <p className="text-muted-foreground flex items-center gap-1">
                      <Mail className="w-4 h-4" />
                      {analytics.profile.email}
                      {analytics.profile.emailVerified && (
                        <span className="text-xs text-green-500 ml-1">(verified)</span>
                      )}
                    </p>
                  )}
                  {analytics.profile.locale && (
                    <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                      <Globe className="w-3 h-3" />
                      {analytics.profile.locale}
                    </p>
                  )}
                </div>
              </div>
            </Card>

            {/* Connection Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="p-4">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <Calendar className="w-4 h-4" />
                  <span className="text-sm">Connected On</span>
                </div>
                <p className="text-lg font-semibold text-foreground">
                  {formatDate(analytics.connectionInfo.connectedAt)}
                </p>
              </Card>
              
              <Card className="p-4">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <Users className="w-4 h-4" />
                  <span className="text-sm">Display Name</span>
                </div>
                <p className="text-lg font-semibold text-foreground">
                  {analytics.connectionInfo.platform_username || analytics.profile.name}
                </p>
              </Card>
            </div>

            {/* Note about additional analytics */}
            <Card className="p-4 bg-blue-500/10 border-blue-500/20">
              <div className="flex items-start gap-3">
                <Info className="w-5 h-5 text-blue-500 mt-0.5" />
                <div>
                  <h3 className="font-medium text-foreground mb-1">Additional Analytics</h3>
                  <p className="text-sm text-muted-foreground">
                    {analytics.note}
                  </p>
                </div>
              </div>
            </Card>
          </div>
        ) : null}
      </main>
    </div>
  );
};

export default LinkedInAnalytics;
