import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { format, startOfWeek, addDays, isSameDay, isToday, addWeeks, subWeeks } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import AppHeader from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Linkedin,
  Instagram,
  Facebook,
  Youtube,
  Globe,
  Mail,
  Play,
  MoreHorizontal,
  Trash2,
  Send,
  Pencil,
  Loader2,
  CalendarDays,
  ExternalLink,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { User } from "@supabase/supabase-js";

interface ScheduledPost {
  id: string;
  post_text: string | null;
  image_url: string | null;
  video_url: string | null;
  content_type: string;
  scheduled_at: string;
  status: string;
}

interface ScheduledCampaign {
  id: string;
  campaign_name: string;
  platforms: string[];
  scheduled_date: string;
  scheduled_time: string;
  status: string;
  image_url?: string;
  video_url?: string;
  post_caption?: string;
}

type CalendarItem = {
  id: string;
  type: "post" | "campaign";
  title: string;
  time: string;
  imageUrl: string | null;
  videoUrl: string | null;
  contentType: string;
  platform: string;
  status: string;
  postUrl: string | null;
  raw: ScheduledPost | ScheduledCampaign;
};

const platformMeta: Record<string, { icon: React.ReactNode; label: string; color: string }> = {
  linkedin: { icon: <Linkedin className="w-3.5 h-3.5" />, label: "Post", color: "text-[#0A66C2]" },
  instagram: { icon: <Instagram className="w-3.5 h-3.5" />, label: "Post", color: "text-[#E4405F]" },
  facebook: { icon: <Facebook className="w-3.5 h-3.5" />, label: "Post", color: "text-[#1877F2]" },
  youtube: { icon: <Youtube className="w-3.5 h-3.5" />, label: "Video", color: "text-[#FF0000]" },
  blog: { icon: <Globe className="w-3.5 h-3.5" />, label: "Blog", color: "text-muted-foreground" },
  email: { icon: <Mail className="w-3.5 h-3.5" />, label: "Email", color: "text-muted-foreground" },
};

const buildPlatformPostUrl = (platform: string, platformPostId: string | null): string | null => {
  if (!platformPostId) return null;
  const p = platform.toLowerCase();
  if (p.includes("linkedin")) {
    // platformPostId is typically the URN like urn:li:share:1234 or activity id
    const id = platformPostId.replace(/^urn:li:(share|activity|ugcPost):/i, "");
    return `https://www.linkedin.com/feed/update/urn:li:activity:${id}/`;
  }
  if (p.includes("instagram")) return `https://www.instagram.com/p/${platformPostId}/`;
  if (p.includes("facebook")) return `https://www.facebook.com/${platformPostId}`;
  if (p.includes("youtube")) return `https://www.youtube.com/watch?v=${platformPostId}`;
  if (p.includes("twitter") || p.includes("x")) return `https://x.com/i/web/status/${platformPostId}`;
  if (p.includes("tiktok")) return `https://www.tiktok.com/video/${platformPostId}`;
  if (p.includes("threads")) return `https://www.threads.net/post/${platformPostId}`;
  return null;
};

const detectPlatform = (contentType: string): string => {
  const t = contentType.toLowerCase();
  if (t.includes("linkedin")) return "linkedin";
  if (t.includes("instagram")) return "instagram";
  if (t.includes("facebook")) return "facebook";
  if (t.includes("youtube")) return "youtube";
  if (t.includes("blog") || t.includes("article")) return "blog";
  if (t.includes("email")) return "email";
  return "linkedin";
};

const Schedule = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [posts, setPosts] = useState<ScheduledPost[]>([]);
  const [campaigns, setCampaigns] = useState<ScheduledCampaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [publishingId, setPublishingId] = useState<string | null>(null);
  const [targetsByPostId, setTargetsByPostId] = useState<Record<string, { platform: string; platform_post_id: string | null; status: string }[]>>({});

  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) navigate("/auth");
      else setUser(user);
    });
  }, [navigate]);

  useEffect(() => {
    if (!user) return;
    const fetchAll = async () => {
      setLoading(true);
      const from = days[0].toISOString();
      const to = addDays(days[6], 1).toISOString();
      const fromDate = format(days[0], "yyyy-MM-dd");
      const toDate = format(addDays(days[6], 1), "yyyy-MM-dd");

      const [postsRes, campaignsRes] = await Promise.all([
        supabase
          .from("post_queue")
          .select("id, post_text, image_url, video_url, content_type, scheduled_at, status")
          .eq("user_id", user.id)
          .gte("scheduled_at", from)
          .lt("scheduled_at", to)
          .in("status", ["scheduled", "approved", "pending_approval", "published"])
          .order("scheduled_at", { ascending: true }),
        supabase
          .from("scheduled_campaigns")
          .select("id, campaign_name, platforms, scheduled_date, scheduled_time, status, image_url, video_url, post_caption")
          .eq("user_id", user.id)
          .gte("scheduled_date", fromDate)
          .lt("scheduled_date", toDate)
          .order("scheduled_date", { ascending: true }),
      ]);

      setPosts((postsRes.data as ScheduledPost[]) || []);
      setCampaigns((campaignsRes.data as ScheduledCampaign[]) || []);

      const postIds = (postsRes.data || []).map((p: any) => p.id);
      if (postIds.length > 0) {
        const { data: targets } = await supabase
          .from("post_platform_targets")
          .select("post_queue_id, platform, platform_post_id, status")
          .in("post_queue_id", postIds);
        const map: Record<string, { platform: string; platform_post_id: string | null; status: string }[]> = {};
        for (const t of targets || []) {
          if (!map[t.post_queue_id]) map[t.post_queue_id] = [];
          map[t.post_queue_id].push({ platform: t.platform, platform_post_id: t.platform_post_id, status: t.status });
        }
        setTargetsByPostId(map);
      } else {
        setTargetsByPostId({});
      }

      setLoading(false);
    };
    fetchAll();
  }, [user, weekStart]);

  // Merge posts + campaigns into unified calendar items per day
  const itemsForDay = (day: Date): CalendarItem[] => {
    const postItems: CalendarItem[] = posts
      .filter((p) => p.scheduled_at && isSameDay(new Date(p.scheduled_at), day))
      .map((p) => {
        const platform = detectPlatform(p.content_type);
        const targets = targetsByPostId[p.id] || [];
        const matched = targets.find((t) => t.platform.toLowerCase().includes(platform)) || targets[0];
        const postUrl = matched ? buildPlatformPostUrl(matched.platform, matched.platform_post_id) : null;
        return {
          id: p.id,
          type: "post" as const,
          title: p.post_text?.slice(0, 120) || p.content_type,
          time: p.scheduled_at ? format(new Date(p.scheduled_at), "h:mma").toLowerCase() : "",
          imageUrl: p.image_url,
          videoUrl: p.video_url,
          contentType: p.content_type,
          platform,
          status: p.status,
          postUrl,
          raw: p,
        };
      });

    const campaignItems: CalendarItem[] = campaigns
      .filter((c) => isSameDay(new Date(c.scheduled_date + "T00:00:00"), day))
      .map((c) => {
        const platform = c.platforms?.[0] || "linkedin";
        const timeParts = c.scheduled_time?.match(/(\d{1,2}):(\d{2})/);
        let timeStr = "";
        if (timeParts) {
          let h = parseInt(timeParts[1]);
          const m = timeParts[2];
          const ampm = h >= 12 ? "pm" : "am";
          if (h > 12) h -= 12;
          if (h === 0) h = 12;
          timeStr = `${h}:${m}${ampm}`;
        }
        return {
          id: c.id,
          type: "campaign" as const,
          title: c.post_caption || c.campaign_name,
          time: timeStr,
          imageUrl: c.image_url || null,
          videoUrl: c.video_url || null,
          contentType: platform,
          platform,
          status: c.status,
          postUrl: null,
          raw: c,
        };
      });

    // Deduplicate by checking if a campaign already has a matching post
    const postTexts = new Set(postItems.map((p) => p.title.slice(0, 40)));
    const uniqueCampaigns = campaignItems.filter((c) => !postTexts.has(c.title.slice(0, 40)));

    return [...postItems, ...uniqueCampaigns].sort((a, b) => a.time.localeCompare(b.time));
  };

  const handleDelete = async (item: CalendarItem) => {
    const table = item.type === "post" ? "post_queue" : "scheduled_campaigns";
    const { error } = await supabase.from(table).delete().eq("id", item.id);
    if (error) {
      toast({ title: "Error", description: "Failed to delete", variant: "destructive" });
    } else {
      if (item.type === "post") setPosts((p) => p.filter((x) => x.id !== item.id));
      else setCampaigns((c) => c.filter((x) => x.id !== item.id));
      toast({ title: "Deleted", description: "Item removed from schedule" });
    }
  };

  const handlePostNow = async (item: CalendarItem) => {
    if (!user) return;
    setPublishingId(item.id);
    try {
      let postQueueId = item.type === "post" ? item.id : null;

      if (item.type === "campaign") {
        const campaign = item.raw as ScheduledCampaign;
        const { data: pq, error: pqError } = await supabase
          .from("post_queue")
          .insert({
            user_id: user.id,
            post_text: campaign.post_caption || campaign.campaign_name,
            content_type: campaign.video_url ? "video" : campaign.image_url ? "image" : "text",
            status: "draft",
            video_url: campaign.video_url || null,
            image_url: campaign.image_url || null,
          })
          .select()
          .single();
        if (pqError || !pq) throw new Error("Failed to create post");
        postQueueId = pq.id;

        const targets = campaign.platforms.map((p) => ({ post_queue_id: pq.id, platform: p, status: "pending" }));
        await supabase.from("post_platform_targets").insert(targets);
      }

      const { data, error } = await supabase.functions.invoke("publish-post", {
        body: { postQueueId },
      });

      if (error) throw new Error(error.message);

      toast({ title: "Published!", description: "Post has been sent live." });

      // Refresh
      if (item.type === "post") {
        setPosts((p) => p.map((x) => (x.id === item.id ? { ...x, status: "published" } : x)));
      } else {
        setCampaigns((c) => c.map((x) => (x.id === item.id ? { ...x, status: "published" } : x)));
      }
    } catch (err: any) {
      toast({ title: "Failed", description: err.message, variant: "destructive" });
    } finally {
      setPublishingId(null);
    }
  };

  const weekLabel = `${format(days[0], "MMM d")} – ${format(days[6], "MMM d, yyyy")}`;

  return (
    <div className="min-h-screen bg-background">
      <AppHeader user={user} />

      <main className="max-w-[1400px] mx-auto px-4 sm:px-6 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/campaigns")} className="h-8 w-8">
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <h1 className="text-xl font-bold text-foreground">Content Calendar</h1>
              <p className="text-sm text-muted-foreground">{weekLabel}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }))} className="text-xs h-8">
              Today
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setWeekStart(subWeeks(weekStart, 1))}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setWeekStart(addWeeks(weekStart, 1))}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Week grid — horizontal scroll, wide open columns */}
        <div className="overflow-x-auto pb-4">
          <div className="flex gap-5" style={{ minWidth: "1400px" }}>
            {days.map((day, dayIdx) => {
              const items = itemsForDay(day);
              const today = isToday(day);
              return (
                <div
                  key={day.toISOString()}
                  className="flex-1 min-w-[260px]"
                >
                  {/* Day header */}
                  <div className={`text-center mb-4 pb-3 ${today ? "" : ""}`}>
                    <p className={`text-xs font-medium uppercase tracking-widest ${today ? "text-primary" : "text-muted-foreground"}`}>
                      {format(day, "EEEE")}
                    </p>
                    <p className={`text-2xl font-bold mt-1 ${today ? "text-primary" : "text-foreground"}`}>
                      {format(day, "d")}
                    </p>
                    {today && (
                      <div className="mx-auto mt-1.5 w-1.5 h-1.5 rounded-full bg-primary" />
                    )}
                  </div>

                  {/* Content stack */}
                  <div className="space-y-4 min-h-[500px]">
                    {loading ? (
                      <>
                        <div className="h-48 rounded-2xl bg-muted/30 animate-pulse" />
                        <div className="h-32 rounded-2xl bg-muted/20 animate-pulse" />
                      </>
                    ) : items.length === 0 ? (
                      <div className="flex items-center justify-center h-32 rounded-2xl bg-muted/10">
                        <p className="text-xs text-muted-foreground/30">No content</p>
                      </div>
                    ) : (
                      items.map((item) => {
                        const meta = platformMeta[item.platform] || platformMeta.linkedin;
                        const isPublished = item.status === "published";
                        return (
                          <div
                            key={item.id}
                            className={`group rounded-2xl bg-card overflow-hidden transition-all hover:shadow-lg hover:-translate-y-0.5 ${
                              isPublished ? "opacity-50" : "shadow-sm"
                            }`}
                          >
                            {/* Media */}
                            {(item.imageUrl || item.videoUrl) && (
                              <div className="relative aspect-[16/10] overflow-hidden">
                                <img
                                  src={item.imageUrl || ""}
                                  alt=""
                                  className="w-full h-full object-cover"
                                />
                                {item.videoUrl && (
                                  <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                                    <div className="w-10 h-10 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center">
                                      <Play className="w-5 h-5 text-white fill-white" />
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Content */}
                            <div className="p-4">
                              {/* Platform + time row */}
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                  <span className={meta.color}>{meta.icon}</span>
                                  <span className="text-xs font-medium text-muted-foreground">{meta.label}</span>
                                  {item.contentType.toLowerCase().includes("ai") && (
                                    <Badge variant="secondary" className="h-5 px-1.5 text-[10px] font-medium">AI</Badge>
                                  )}
                                </div>
                                <span className="text-xs text-muted-foreground">{item.time}</span>
                              </div>

                              {/* Text preview */}
                              <p className="text-sm text-foreground leading-relaxed line-clamp-4 mb-3">
                                {item.title}
                              </p>

                              {/* Show post button */}
                              <Button
                                variant="outline"
                                size="sm"
                                className="w-full mb-3 h-8 text-xs gap-1.5"
                                disabled={!item.postUrl}
                                onClick={() => item.postUrl && window.open(item.postUrl, "_blank", "noopener,noreferrer")}
                                title={item.postUrl ? "Open post on platform" : "Post URL not available yet"}
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                                Show post
                              </Button>

                              {/* Status + actions */}
                              <div className="flex items-center justify-between">
                                <Badge
                                  variant="outline"
                                  className={`text-[10px] h-5 capitalize ${
                                    isPublished
                                      ? "border-green-500/30 text-green-600 bg-green-500/5"
                                      : item.status === "pending_approval"
                                      ? "border-amber-500/30 text-amber-600 bg-amber-500/5"
                                      : "border-primary/20 text-primary bg-primary/5"
                                  }`}
                                >
                                  {item.status.replace("_", " ")}
                                </Badge>

                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <button className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-lg hover:bg-muted">
                                      <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
                                    </button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end" className="w-36">
                                    {!isPublished && (
                                      <DropdownMenuItem onClick={() => handlePostNow(item)} disabled={publishingId === item.id}>
                                        {publishingId === item.id ? (
                                          <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />
                                        ) : (
                                          <Send className="w-3.5 h-3.5 mr-2" />
                                        )}
                                        Post Now
                                      </DropdownMenuItem>
                                    )}
                                    <DropdownMenuItem
                                      onClick={() => handleDelete(item)}
                                      className="text-destructive focus:text-destructive"
                                    >
                                      <Trash2 className="w-3.5 h-3.5 mr-2" />
                                      Delete
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </main>
    </div>
  );
};

export default Schedule;
