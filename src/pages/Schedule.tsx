import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import AppHeader from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ArrowLeft, CalendarDays, Trash2, Send, Pencil, Check, X, Clock, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
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
  const [publishingId, setPublishingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDate, setEditDate] = useState<Date | undefined>();
  const [editTime, setEditTime] = useState("");
  const [editPeriod, setEditPeriod] = useState<"AM" | "PM">("AM");

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
      toast({ title: "Error", description: "Failed to delete campaign", variant: "destructive" });
    } else {
      setCampaigns(campaigns.filter(c => c.id !== id));
      toast({ title: "Deleted", description: "Campaign has been removed" });
    }
  };

  const startEditing = (campaign: ScheduledCampaign) => {
    setEditingId(campaign.id);
    setEditDate(new Date(campaign.scheduled_date + "T00:00:00"));
    // Parse time - could be "10:45:00" (24h) or "10:45 AM" format
    const timeParts = campaign.scheduled_time.match(/(\d{1,2}):(\d{2})/);
    if (timeParts) {
      let hour = parseInt(timeParts[1]);
      const min = timeParts[2];
      if (hour >= 12) {
        setEditPeriod("PM");
        if (hour > 12) hour -= 12;
      } else {
        setEditPeriod("AM");
        if (hour === 0) hour = 12;
      }
      setEditTime(`${hour}:${min}`);
    } else {
      setEditTime("12:00");
      setEditPeriod("AM");
    }
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditTime("");
    setEditDate(undefined);
  };

  const saveEditing = async (id: string) => {
    if (!editDate || !editTime) return;

    // Convert to 24h format for DB
    const timeParts = editTime.match(/(\d{1,2}):(\d{2})/);
    if (!timeParts) {
      toast({ title: "Invalid time", description: "Please enter a valid time like 9:30", variant: "destructive" });
      return;
    }
    let hour = parseInt(timeParts[1]);
    const min = timeParts[2];
    if (editPeriod === "PM" && hour < 12) hour += 12;
    if (editPeriod === "AM" && hour === 12) hour = 0;
    const time24 = `${String(hour).padStart(2, "0")}:${min}:00`;

    const dateStr = format(editDate, "yyyy-MM-dd");

    const { error } = await supabase
      .from("scheduled_campaigns")
      .update({ scheduled_date: dateStr, scheduled_time: time24 })
      .eq("id", id);

    if (error) {
      toast({ title: "Error", description: "Failed to update schedule", variant: "destructive" });
    } else {
      setCampaigns(campaigns.map(c =>
        c.id === id ? { ...c, scheduled_date: dateStr, scheduled_time: time24 } : c
      ));
      toast({ title: "Updated", description: "Schedule has been updated" });
      setEditingId(null);
    }
  };

  const handlePostNow = async (campaign: ScheduledCampaign) => {
    if (!user) return;
    setPublishingId(campaign.id);

    try {
      // 1. Fetch full campaign data including media URLs
      const { data: fullCampaign, error: fetchError } = await supabase
        .from("scheduled_campaigns")
        .select("*")
        .eq("id", campaign.id)
        .single();

      if (fetchError || !fullCampaign) {
        throw new Error("Failed to fetch campaign details");
      }

      // 2. Create a post_queue entry with media
      const hasVideo = !!(fullCampaign as any).video_url;
      const hasImage = !!(fullCampaign as any).image_url;
      const contentType = hasVideo ? "video" : hasImage ? "image" : "text";

      const { data: postQueue, error: pqError } = await supabase
        .from("post_queue")
        .insert({
          user_id: user.id,
          post_text: (fullCampaign as any).post_caption || campaign.campaign_name,
          content_type: contentType,
          status: "draft",
          video_url: (fullCampaign as any).video_url || null,
          image_url: (fullCampaign as any).image_url || null,
          media_urls: (fullCampaign as any).media_urls || [],
        })
        .select()
        .single();

      if (pqError || !postQueue) {
        throw new Error(pqError?.message || "Failed to create post queue entry");
      }

      // 2. Create platform targets
      const targets = campaign.platforms.map(platform => ({
        post_queue_id: postQueue.id,
        platform,
        status: "pending",
      }));

      const { error: targetError } = await supabase
        .from("post_platform_targets")
        .insert(targets);

      if (targetError) {
        throw new Error(targetError.message);
      }

      // 3. Call publish-post edge function
      const { data, error } = await supabase.functions.invoke("publish-post", {
        body: { postQueueId: postQueue.id },
      });

      if (error) {
        throw new Error(error.message);
      }

      // 4. Update scheduled campaign status
      await supabase
        .from("scheduled_campaigns")
        .update({ status: data?.status === "published" ? "published" : data?.status || "attempted" })
        .eq("id", campaign.id);

      setCampaigns(campaigns.map(c =>
        c.id === campaign.id ? { ...c, status: data?.status || "attempted" } : c
      ));

      if (data?.results) {
        const successes = data.results.filter((r: any) => r.success);
        const failures = data.results.filter((r: any) => !r.success);

        if (successes.length > 0) {
          toast({
            title: "Published!",
            description: `Posted to: ${successes.map((r: any) => r.platform).join(", ")}${failures.length > 0 ? `. Failed: ${failures.map((r: any) => `${r.platform} (${r.error})`).join(", ")}` : ""}`,
          });
        } else {
          toast({
            title: "Publishing failed",
            description: failures.map((r: any) => `${r.platform}: ${r.error}`).join("; "),
            variant: "destructive",
          });
        }
      }
    } catch (err: any) {
      console.error("Post now error:", err);
      toast({
        title: "Publishing failed",
        description: err.message || "Unknown error",
        variant: "destructive",
      });
    } finally {
      setPublishingId(null);
    }
  };

  const formatDisplayTime = (timeStr: string) => {
    const match = timeStr.match(/(\d{1,2}):(\d{2})/);
    if (!match) return timeStr;
    let hour = parseInt(match[1]);
    const min = match[2];
    const period = hour >= 12 ? "PM" : "AM";
    if (hour > 12) hour -= 12;
    if (hour === 0) hour = 12;
    return `${hour}:${min} ${period}`;
  };

  const campaignDates = campaigns.map(c => new Date(c.scheduled_date + "T00:00:00"));

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
                          <div className="flex items-start justify-between gap-3">
                            <div className="space-y-2 flex-1">
                              <div className="flex items-center gap-2">
                                <h3 className="font-semibold text-foreground">{campaign.campaign_name}</h3>
                                {campaign.status === "published" && (
                                  <span className="px-2 py-0.5 rounded text-xs bg-green-500/20 text-green-600">Published</span>
                                )}
                                {campaign.status === "failed" && (
                                  <span className="px-2 py-0.5 rounded text-xs bg-destructive/20 text-destructive">Failed</span>
                                )}
                                {campaign.status === "partial" && (
                                  <span className="px-2 py-0.5 rounded text-xs bg-yellow-500/20 text-yellow-600">Partial</span>
                                )}
                              </div>

                              {editingId === campaign.id ? (
                                <div className="space-y-3">
                                  {/* Date picker */}
                                  <Popover>
                                    <PopoverTrigger asChild>
                                      <Button variant="outline" size="sm" className="w-full justify-start text-left">
                                        <CalendarDays className="w-4 h-4 mr-2" />
                                        {editDate ? format(editDate, "PPP") : "Pick a date"}
                                      </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0" align="start">
                                      <Calendar
                                        mode="single"
                                        selected={editDate}
                                        onSelect={setEditDate}
                                        className="p-3 pointer-events-auto"
                                        disabled={(d) => {
                                          const today = new Date();
                                          today.setHours(0, 0, 0, 0);
                                          return d < today;
                                        }}
                                      />
                                    </PopoverContent>
                                  </Popover>

                                  {/* Time input */}
                                  <div className="flex items-center gap-2">
                                    <div className="relative flex-1">
                                      <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                      <Input
                                        placeholder="e.g. 9:30"
                                        className="pl-9 h-9"
                                        value={editTime}
                                        onChange={(e) => {
                                          let val = e.target.value.replace(/[^0-9:]/g, "");
                                          if (val.length === 2 && !val.includes(":")) val += ":";
                                          if (val.length > 5) val = val.slice(0, 5);
                                          setEditTime(val);
                                        }}
                                      />
                                    </div>
                                    <div className="flex rounded-lg border overflow-hidden">
                                      <button
                                        type="button"
                                        className={cn(
                                          "px-3 py-1.5 text-sm font-medium transition-colors",
                                          editPeriod === "AM"
                                            ? "bg-primary text-primary-foreground"
                                            : "bg-background text-muted-foreground hover:bg-muted"
                                        )}
                                        onClick={() => setEditPeriod("AM")}
                                      >
                                        AM
                                      </button>
                                      <button
                                        type="button"
                                        className={cn(
                                          "px-3 py-1.5 text-sm font-medium transition-colors",
                                          editPeriod === "PM"
                                            ? "bg-primary text-primary-foreground"
                                            : "bg-background text-muted-foreground hover:bg-muted"
                                        )}
                                        onClick={() => setEditPeriod("PM")}
                                      >
                                        PM
                                      </button>
                                    </div>
                                  </div>

                                  <div className="flex gap-2">
                                    <Button size="sm" onClick={() => saveEditing(campaign.id)} className="gap-1">
                                      <Check className="w-3 h-3" /> Save
                                    </Button>
                                    <Button size="sm" variant="ghost" onClick={cancelEditing} className="gap-1">
                                      <X className="w-3 h-3" /> Cancel
                                    </Button>
                                  </div>
                                </div>
                              ) : (
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                  <CalendarDays className="w-4 h-4" />
                                  <span>
                                    {format(new Date(campaign.scheduled_date + "T00:00:00"), "PPP")} at {formatDisplayTime(campaign.scheduled_time)}
                                  </span>
                                  {campaign.status === "scheduled" && (
                                    <button
                                      onClick={() => startEditing(campaign)}
                                      className="text-primary hover:text-primary/80"
                                    >
                                      <Pencil className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                </div>
                              )}

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

                            <div className="flex items-center gap-1">
                              {campaign.status === "scheduled" && (
                                <Button
                                  variant="default"
                                  size="sm"
                                  onClick={() => handlePostNow(campaign)}
                                  disabled={publishingId === campaign.id}
                                  className="gap-1.5"
                                >
                                  {publishingId === campaign.id ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                  ) : (
                                    <Send className="w-4 h-4" />
                                  )}
                                  Post Now
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDelete(campaign.id)}
                                className="text-muted-foreground hover:text-destructive"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
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
