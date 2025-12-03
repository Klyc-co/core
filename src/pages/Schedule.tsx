import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import AppHeader from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { ArrowLeft, CalendarDays, Trash2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import type { User } from "@supabase/supabase-js";

interface ScheduledCampaign {
  id: string;
  campaign_name: string;
  platforms: string[];
  scheduled_date: string;
  scheduled_time: string;
  status: string;
  created_at: string;
}

const platformColors: Record<string, string> = {
  instagram: "bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400",
  facebook: "bg-[#1877F2]",
  twitter: "bg-neutral-900",
  linkedin: "bg-[#0A66C2]",
  tiktok: "bg-neutral-900",
  youtube: "bg-[#FF0000]",
  pinterest: "bg-[#E60023]",
  threads: "bg-neutral-900",
};

const Schedule = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [campaigns, setCampaigns] = useState<ScheduledCampaign[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        navigate("/auth");
      } else {
        setUser(user);
        fetchCampaigns(user.id);
      }
    });
  }, [navigate]);

  const fetchCampaigns = async (userId: string) => {
    const { data, error } = await supabase
      .from("scheduled_campaigns")
      .select("*")
      .eq("user_id", userId)
      .order("scheduled_date", { ascending: true });

    if (error) {
      console.error("Error fetching campaigns:", error);
    } else {
      setCampaigns(data as ScheduledCampaign[]);
    }
    setIsLoading(false);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase
      .from("scheduled_campaigns")
      .delete()
      .eq("id", id);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to delete campaign",
        variant: "destructive",
      });
    } else {
      setCampaigns(campaigns.filter(c => c.id !== id));
      toast({
        title: "Deleted",
        description: "Campaign has been removed",
      });
    }
  };

  // Get dates that have campaigns for calendar highlighting
  const campaignDates = campaigns.map(c => new Date(c.scheduled_date));

  return (
    <div className="min-h-screen bg-background">
      <AppHeader user={user} />
      
      <main className="max-w-6xl mx-auto px-6 py-12">
        <div className="flex items-center gap-4 mb-2">
          <Button 
            variant="ghost" 
            onClick={() => navigate("/campaigns")}
            className="text-primary hover:text-primary/80"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Campaigns
          </Button>
        </div>
        
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">Scheduled Campaigns</h1>
          <p className="text-muted-foreground">View and manage all your scheduled campaigns</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Scheduled Campaigns List */}
          <div className="lg:col-span-2">
            <Card>
              <CardContent className="p-6">
                <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
                  <CalendarDays className="w-5 h-5" />
                  All Scheduled Campaigns
                </h2>
                
                {isLoading ? (
                  <p className="text-muted-foreground text-center py-8">Loading campaigns...</p>
                ) : campaigns.length === 0 ? (
                  <Card className="border-dashed">
                    <CardContent className="p-8 text-center text-muted-foreground">
                      No scheduled campaigns yet. Create a campaign and schedule it to see it here.
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-4">
                    {campaigns.map((campaign) => (
                      <Card key={campaign.id} className="overflow-hidden">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div className="space-y-2">
                              <h3 className="font-semibold text-foreground">{campaign.campaign_name}</h3>
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <CalendarDays className="w-4 h-4" />
                                <span>
                                  {format(new Date(campaign.scheduled_date), "PPP")} at {campaign.scheduled_time}
                                </span>
                              </div>
                              <div className="flex flex-wrap gap-1.5 mt-2">
                                {campaign.platforms.map((platform) => (
                                  <span
                                    key={platform}
                                    className={`px-2 py-0.5 rounded text-xs text-white ${platformColors[platform] || "bg-secondary"}`}
                                  >
                                    {platform}
                                  </span>
                                ))}
                              </div>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(campaign.id)}
                              className="text-muted-foreground hover:text-destructive"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Calendar */}
          <div className="lg:col-span-1">
            <Card>
              <CardContent className="p-6">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={setDate}
                  className="rounded-md pointer-events-auto"
                  modifiers={{
                    scheduled: campaignDates,
                  }}
                  modifiersClassNames={{
                    scheduled: "bg-primary/20 text-primary font-bold",
                  }}
                />
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Schedule;
